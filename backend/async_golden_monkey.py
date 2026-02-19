import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models.golden_monkey_slots import GoldenMonkeySlot
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disable noisy logging
logging.getLogger('playwright').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
]

def random_delay(min_delay=0.5, max_delay=1):  # Reduced max delay
    return random.uniform(min_delay, max_delay)

async def process_date(page, date):
    try:
        # Step 1: Wait for and select site
        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_site"]', timeout=20000)
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_site"]', label='Volcanoes National Park')
        
        # Wait for product dropdown to be populated
        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_product"]', timeout=20000)
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_product"]', label='Golden Monkeys')

        # Fill date and wait
        await asyncio.sleep(random_delay())
        date_input = page.locator('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]')
        await date_input.fill(date)
        await page.press('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]', 'Tab')
        await asyncio.sleep(random_delay())

        # First check for the "No slots" error message
        error_element = await page.query_selector('div#form\\:messages ul li.alert.alert-danger')
        if error_element:
            error_text = await error_element.text_content()
            if "No slots available on date selected" in error_text:
                return date, "Sold Out"
        
        # If no error message, check for slots
        await page.wait_for_selector('//input[@id="form:visitorAndCategoryDetails_slots"]', timeout=20000)
        input_value = await page.input_value('//input[@id="form:visitorAndCategoryDetails_slots"]')
        if input_value:
            return date, input_value
        
        return None

    except Exception:
        return None  # Just return None to trigger retry

async def process_dates_in_tab(context, dates):
    page = await context.new_page()
    results = []
    
    try:
        await page.goto(
            "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
            timeout=20000,
            wait_until='networkidle'
        )
        
        total_dates = len(dates)
        for idx, date in enumerate(dates, 1):
            try:
                result = await process_date(page, date)
                
                if result is None:
                    retry_result = await retry_date_in_new_tab(context, date)
                    if retry_result:
                        results.append(retry_result)
                else:
                    results.append(result)
                
                await asyncio.sleep(1)  # Reduced sleep between dates
            except Exception:
                continue
                
    finally:
        await page.close()
    
    return results

async def retry_date_in_new_tab(context, date):
    try:
        page = await context.new_page()
        await page.goto(
            "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
            timeout=20000,
            wait_until='networkidle'
        )
        result = await process_date(page, date)
        await page.close()
        return result
    except Exception:
        if page:
            await page.close()
        return None

async def scrape_golden_monkey_slots(start_offset=0):
    db = None
    try:
        db = SessionLocal()
        
        # First, clean up past dates from database
        today = datetime.now().date()
        try:
            slots_to_delete = db.query(GoldenMonkeySlot).all()
            for slot in slots_to_delete:
                try:
                    slot_date = datetime.strptime(slot.date, "%d/%m/%Y").date()
                    if slot_date < today:
                        db.delete(slot)
                except Exception as date_error:
                    logger.error(f"Error parsing date {slot.date}: {str(date_error)}")
                    continue
            
            db.commit()
            logger.info("Cleaned up past dates from database")
        except Exception as e:
            logger.error(f"Error cleaning past dates: {str(e)}")
            db.rollback()
        
        # Get dates for this batch, starting from today
        start_date = today + timedelta(days=start_offset)
        dates = [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(30)]
        
        batch_start_time = time.time()
        logger.info(f"Retrieving data for dates: {dates[0]} to {dates[-1]}")
        
        num_tabs = 10
        date_batches = [dates[i::num_tabs] for i in range(num_tabs)]
        
        async with async_playwright() as p:
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                
                # Create single context for all tabs
                context = await browser.new_context(
                    user_agent=random.choice(USER_AGENTS),
                    viewport={'width': 1920, 'height': 1080}
                )
                
                # Process all batches in parallel
                tasks = [process_dates_in_tab(context, batch) for batch in date_batches]
                batch_results = await asyncio.gather(*tasks)
                all_results = [item for sublist in batch_results for item in sublist if item]
                
                await context.close()
                await browser.close()
                
                if not all_results:
                    logger.error("No results were collected in this batch")
                    return []

                # Save to database
                saved_count = 0
                for date, slots in all_results:
                    if not date or not slots:
                        continue

                    try:
                        date_obj = datetime.strptime(date, "%d/%m/%Y").date()
                        if date_obj >= today:
                            existing_slot = db.query(GoldenMonkeySlot).filter(
                                GoldenMonkeySlot.date == date
                            ).first()

                            if existing_slot:
                                existing_slot.slots = slots
                                existing_slot.updated_at = datetime.utcnow()
                            else:
                                new_slot = GoldenMonkeySlot(
                                    date=date,
                                    slots=slots
                                )
                                db.add(new_slot)
                            saved_count += 1
                    except Exception as e:
                        logger.error(f"Database error for date {date}: {str(e)}")
                        db.rollback()
                        continue

                try:
                    db.commit()
                except Exception as e:
                    logger.error(f"Error committing batch to database: {str(e)}")
                    db.rollback()
                
                batch_time = time.time() - batch_start_time
                logger.info(f"Completed dates {dates[0]} to {dates[-1]} in {batch_time:.2f} seconds ({saved_count} slots)")
                
            except Exception as e:
                logger.error(f"Browser error: {str(e)}")
                raise
                
    except Exception as e:
        logger.error(f"Error in scrape_golden_monkey_slots: {str(e)}")
        raise
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    asyncio.run(scrape_golden_monkey_slots()) 