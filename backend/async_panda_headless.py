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
        
        # Navigate to page for each date
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
        
        # Get slots value
        slots_selector = '//input[@id="form:visitorAndCategoryDetails_slots"]'
        try:
            await page.wait_for_selector(slots_selector, state='visible', timeout=5000)
            slots_value = await page.input_value(slots_selector)
            
            # Only mark as "Sold Out" if the field exists but has no value
            if slots_value == "":
                print(f"No slots value for date {date} - marking as Sold Out")
                return {
                    "Date": date,
                    "Attendance": "Sold Out"
                }
            
            print(f"Got slots value for date {date}: {slots_value}")
            return {
                "Date": date,
                "Attendance": slots_value
            }
            
        except Exception as e:
            print(f"Error getting slots for {date}, will retry in new tab: {str(e)}")
            return None  # Return None to trigger retry
            
    except Exception as e:
        print(f"Error processing date {date}: {str(e)}")
        return None  # Return None to trigger retry

async def process_dates_in_tab(context, dates):
    results = []
    
    for date in dates:
        page = await context.new_page()
        try:
            result = await process_date(page, date)
            if result is None:
                print(f"Retrying date {date} in new tab...")
                # Try one more time with a fresh page
                retry_page = await context.new_page()
                try:
                    retry_result = await process_date(retry_page, date)
                    if retry_result:
                        results.append(retry_result)
                        print(f"Retry successful for {date}: {retry_result['Attendance']}")
                    else:
                        print(f"Retry failed for {date}, skipping")
                finally:
                    await retry_page.close()
            else:
                results.append(result)
                print(f"Added result for {date}: {result['Attendance']}")
        finally:
            await page.close()
            await asyncio.sleep(1)
    
    return results

async def main():
    try:
        print("Starting main scraping function...")
        day_after_tomorrow = datetime.now() + timedelta(days=12)
        num_days = 80
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
                    
                    logging.info(f"Processing result - Date: {date}, Slots: {slots}")
                    
                    existing_slot = db.query(AvailableSlot).filter(
                        AvailableSlot.date == date
                    ).first()
                    
                    if existing_slot:
                        existing_slot.slots = slots
                        existing_slot.updated_at = datetime.utcnow()
                        logging.info(f"Updated slot for date {date}: {slots}")
                    else:
                        new_slot = AvailableSlot(
                            date=date,
                            slots=slots
                        )
                        db.add(new_slot)
                        logging.info(f"Added new slot for date {date}: {slots}")
                
                    db.commit()
                except Exception as e:
                    logging.error(f"Error saving data for date {date}: {e}")
                    db.rollback()

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

if __name__ == "__main__":
    asyncio.run(scrape_slots())