import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import random
from app.models.scrape_status import ScrapeStatus
from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraping.log'),
        logging.StreamHandler()
    ]
)

# List of user agents
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
]

def generate_dates(start_date, num_days):
    return [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(num_days)]

def random_delay(min_delay=0.5, max_delay=3):
    return random.uniform(min_delay, max_delay)

async def process_date(page, date):
    try:
        print(f"Processing date: {date}")
        
        # Make selections first
        await page.goto("https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml", 
                       wait_until='networkidle')
        
        # Wait for site dropdown and verify it exists
        site_selector = '//select[@id="form:visitorAndCategoryDetails_site"]'
        await page.wait_for_selector(site_selector, timeout=60000)
        
        # Select site and wait
        await page.select_option(site_selector, label='Volcanoes National Park')
        await asyncio.sleep(2)
        
        # Wait for product dropdown to be populated
        product_selector = '//select[@id="form:visitorAndCategoryDetails_product"]'
        await page.wait_for_selector(product_selector, timeout=60000)
        
        # Select product
        await page.select_option(product_selector, label='Mountain gorillas')
        await asyncio.sleep(2)
        
        # Fill date and wait for response
        date_selector = '//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]'
        await page.fill(date_selector, date)
        await page.press(date_selector, 'Tab')
        await asyncio.sleep(2)

        # Wait for either slots input or error message
        await page.wait_for_selector(
            'input#form\\:visitorAndCategoryDetails_slots, div#form\\:messages ul li.alert.alert-danger',
            timeout=10000
        )
        
        # Check for error message first
        error_element = await page.query_selector('div#form\\:messages ul li.alert.alert-danger')
        if error_element:
            error_text = await error_element.text_content()
            print(f"Found error message for {date}: '{error_text}'")
            
            if "No slots available on date selected" in error_text:
                print(f"SOLD OUT FOUND - Date {date} is Sold Out (confirmed by error message)")
                return {
                    "Date": date,
                    "Attendance": "Sold Out"
                }

        # Check for slots value
        slots_element = await page.query_selector('input#form\\:visitorAndCategoryDetails_slots')
        if slots_element:
            slots_value = await slots_element.input_value()
            if slots_value.strip():
                print(f"Got slots value for date {date}: {slots_value}")
                return {
                    "Date": date,
                    "Attendance": slots_value
                }

        # If we get here, we found neither slots nor "sold out" message
        print(f"No clear result for {date}, will retry in new tab")
        return None

    except Exception as e:
        print(f"Error processing date {date}: {str(e)}")
        return None

async def process_dates_in_tab(context, dates):
    results = []
    
    for date in dates:
        page = await context.new_page()
        try:
            result = await process_date(page, date)
            if result is None:  # If initial attempt failed, retry in new tab
                print(f"Initial attempt failed for {date}, retrying in new tab...")
                result = await retry_date_in_new_tab(context, date)
            
            if result:
                if result['Attendance'] == "Sold Out":
                    print(f"SOLD OUT ADDED to results - Date: {date}")
                results.append(result)
                print(f"Added result for {date}: {result['Attendance']}")
        finally:
            await page.close()
            await asyncio.sleep(1)
    
    # Log summary of results
    sold_out_count = len([r for r in results if r['Attendance'] == "Sold Out"])
    print(f"Batch results - Total: {len(results)}, Sold Out: {sold_out_count}")
    return results

async def main():
    try:
        print("Starting main scraping function...")
        day_after_tomorrow = datetime.now() + timedelta(days=2)
        num_days = 30
        num_tabs = 10
        dates = generate_dates(day_after_tomorrow, num_days)
        date_batches = [dates[i::num_tabs] for i in range(num_tabs)]

        async with async_playwright() as p:
            try:
                user_agent = random.choice(USER_AGENTS)
                print("Launching browser with modified config...")
                
                browser = await p.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                    ]
                )
                print("Browser launched successfully")
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent=user_agent
                )
                
                try:
                    print("Starting scraping tasks...")
                    tasks = [process_dates_in_tab(context, batch) for batch in date_batches]
                    all_results = await asyncio.gather(*tasks)
                    print("Completed scraping tasks")
                finally:
                    await context.close()
                    await browser.close()

                results = [item for sublist in all_results for item in sublist if item is not None]
                results.sort(key=lambda x: datetime.strptime(x["Date"], "%d/%m/%Y"))
                print(f"Successfully scraped {len(results)} slots")
                return results

            except Exception as browser_error:
                print(f"Browser error: {browser_error}")
                raise
    except Exception as e:
        print(f"Error in main function: {e}")
        raise

async def scrape_slots():
    """Function to be called by the scheduler"""
    db = None
    try:
        logging.info("Starting scrape_slots function")
        db = SessionLocal()
        logging.info("Created database session")
        
        try:
            status_record = ScrapeStatus(
                status="running",
                message="Starting scrape",
                last_run=datetime.utcnow()
            )
            db.add(status_record)
            db.commit()
            logging.info("Created status record")

            results = await main()
            if not results:
                raise Exception("No results returned from scraping")
                
            logging.info(f"Completed scraping with {len(results)} results")

            for result in results:
                try:
                    date = result["Date"]
                    slots = result["Attendance"]
                    
                    if slots == "Sold Out":
                        logging.info(f"SOLD OUT SAVING to database - Date: {date}")
                    
                    existing_slot = db.query(AvailableSlot).filter(
                        AvailableSlot.date == date
                    ).first()
                    
                    if existing_slot:
                        existing_slot.slots = slots
                        existing_slot.updated_at = datetime.utcnow()
                        if slots == "Sold Out":
                            logging.info(f"SOLD OUT UPDATED in database - Date: {date}")
                    else:
                        new_slot = AvailableSlot(
                            date=date,
                            slots=slots
                        )
                        db.add(new_slot)
                        if slots == "Sold Out":
                            logging.info(f"SOLD OUT ADDED to database - Date: {date}")
                
                    db.commit()
                except Exception as e:
                    logging.error(f"Error saving data for date {date}: {e}")
                    db.rollback()

            # Add summary logging
            sold_out_count = db.query(AvailableSlot).filter(
                AvailableSlot.slots == "Sold Out"
            ).count()
            logging.info(f"Final database state - Sold Out dates count: {sold_out_count}")

            status_record.status = "success"
            status_record.message = f"Scrape completed successfully. Found {len(results)} slots."
            db.commit()
            logging.info("Updated status to success")
            
            return results
            
        except Exception as scrape_error:
            logging.error(f"Error during scraping: {str(scrape_error)}")
            if 'status_record' in locals():
                status_record.status = "failed"
                status_record.message = f"Scraping failed: {str(scrape_error)}"
                db.commit()
            raise scrape_error
            
    except Exception as e:
        logging.error(f"Error in scrape_slots: {str(e)}")
        raise
    finally:
        if db:
            db.close()
            logging.info("Closed database connection")

async def retry_date_in_new_tab(context, date):
    try:
        print(f"Retrying date {date} in new tab")
        page = await context.new_page()
        result = await process_date(page, date)
        await page.close()
        
        if result:
            return result
            
        # If still no result after retry, mark as Error Loading
        print(f"Still no clear result for {date} after retry")
        return {
            "Date": date,
            "Attendance": "Error Loading"
        }
        
    except Exception as e:
        print(f"Error in retry for {date}: {str(e)}")
        if 'page' in locals():
            await page.close()
        return {
            "Date": date,
            "Attendance": "Error Loading"
        }

if __name__ == "__main__":
    asyncio.run(scrape_slots())