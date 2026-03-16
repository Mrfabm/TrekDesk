import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import random
from app.models.scrape_status import ScrapeStatus
from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
import logging
from contextlib import contextmanager

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

async def process_date(page, date, wait_time=30000):
    try:
        # Add random delay between requests
        await asyncio.sleep(random.uniform(1, 3))
        
        print(f"Processing date: {date}")
        
        # Add retry mechanism
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await page.goto(
                    "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml", 
                    wait_until='networkidle',
                    timeout=wait_time
                )
                break  # If successful, break the retry loop
            except Exception as e:
                if attempt == max_retries - 1:  # If last attempt
                    raise  # Re-raise the exception
                print(f"Attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(2)  # Wait 2 seconds before retrying
        
        # Wait for site dropdown and verify it exists
        site_selector = '//select[@id="form:visitorAndCategoryDetails_site"]'
        await page.wait_for_selector(site_selector, timeout=wait_time)
        
        # Select site and wait
        await page.select_option(site_selector, label='Volcanoes National Park')
        await asyncio.sleep(2)
        
        # Wait for product dropdown to be populated
        product_selector = '//select[@id="form:visitorAndCategoryDetails_product"]'
        await page.wait_for_selector(product_selector, timeout=wait_time)
        
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
            timeout=wait_time
        )
        
        # Check for error message first
        error_element = await page.query_selector('div#form\\:messages ul li.alert.alert-danger')
        if error_element:
            error_text = await error_element.text_content()
            print(f"Found error message for {date}: '{error_text}'")
            
            # Only return Sold Out if explicitly confirmed by message
            if "No slots available on date selected" in error_text:
                print(f"SOLD OUT FOUND - Date {date} is Sold Out (confirmed by error message)")
                return {
                    "Date": date,
                    "Attendance": "Sold Out"
                }
            # For any other error message, return None to trigger retry
            return None

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

        # If we get here, something went wrong but we don't know what
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

async def main(start_date=None):
    try:
        print("Starting main scraping function...")
        # Use provided start_date or default to day after tomorrow
        start_date = start_date or (datetime.now() + timedelta(days=2))
        num_days = 30
        num_tabs = 10
        dates = generate_dates(start_date, num_days)
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

@contextmanager
def get_db_connection():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def scrape_slots():
    with get_db_connection() as db:
        try:
            # Create status record
            status_record = ScrapeStatus(
                status="running",
                message="Starting scrape",
                last_run=datetime.utcnow()
            )
            db.add(status_record)
            db.commit()
        except Exception as e:
            logging.error(f"Error in scrape_slots: {str(e)}")
            raise

async def retry_date_in_new_tab(context, date):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            page = await context.new_page()
            result = await process_date(page, date)
            await page.close()
            
            if result:
                return result
                
            await asyncio.sleep(2)  # Wait between retries
            
        except Exception as e:
            logging.error(f"Attempt {attempt + 1} failed for date {date}: {str(e)}")
            if 'page' in locals():
                await page.close()
            
            if attempt == max_retries - 1:
                logging.error(f"All retries failed for date {date}")
                return None

if __name__ == "__main__":
    asyncio.run(scrape_slots())