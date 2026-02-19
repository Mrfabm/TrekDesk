import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import random
from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
from app.models.golden_monkey_slots import GoldenMonkeySlot
import logging
import time
from typing import List, Tuple, Optional, Type

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger('playwright').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
]

class FastScraper:
    def __init__(self, slot_model: Type, product_name: str, num_workers: int = 15):
        self.slot_model = slot_model
        self.product_name = product_name
        self.num_workers = num_workers
        self.retry_queue = asyncio.Queue()
        self.results = []
        self.processing_dates = set()
        self.batch_size = 100  # Process more dates at once
        
    async def process_date(self, page: any, date: str) -> Optional[Tuple[str, str]]:
        try:
            if not await page.query_selector('//select[@id="form:visitorAndCategoryDetails_site"]'):
                await page.goto(
                    "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
                    timeout=15000,
                    wait_until='networkidle'
                )
            
            # Quick selectors without waiting
            await page.select_option('//select[@id="form:visitorAndCategoryDetails_site"]', label='Volcanoes National Park')
            await asyncio.sleep(0.3)
            
            await page.select_option('//select[@id="form:visitorAndCategoryDetails_product"]', label=self.product_name)
            await asyncio.sleep(0.3)
            
            await page.fill('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]', date)
            await page.press('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]', 'Tab')
            await asyncio.sleep(0.3)

            # Check for error message
            error_element = await page.query_selector('div#form\\:messages ul li.alert.alert-danger')
            if error_element:
                error_text = await error_element.text_content()
                if "No slots available on date selected" in error_text:
                    return date, "Sold Out"
            
            # Check for slots
            slots_input = await page.query_selector('//input[@id="form:visitorAndCategoryDetails_slots"]')
            if slots_input:
                input_value = await slots_input.input_value()
                if input_value:
                    return date, input_value
            
            return None
        except Exception:
            return None

    async def worker(self, context: any, worker_id: int, dates_queue: asyncio.Queue):
        page = await context.new_page()
        try:
            while True:
                try:
                    date = await dates_queue.get()
                    if date is None:  # Poison pill
                        break
                        
                    if date in self.processing_dates:
                        dates_queue.task_done()
                        continue
                        
                    self.processing_dates.add(date)
                    result = await self.process_date(page, date)
                    
                    if result:
                        self.results.append(result)
                    else:
                        await self.retry_queue.put(date)
                        
                    dates_queue.task_done()
                    
                except Exception as e:
                    logger.error(f"Worker {worker_id} error: {str(e)}")
                    dates_queue.task_done()
                    
        finally:
            await page.close()

    async def retry_worker(self, context: any, worker_id: int):
        page = await context.new_page()
        try:
            while True:
                try:
                    date = await self.retry_queue.get()
                    if date is None:  # Poison pill
                        break
                        
                    result = await self.process_date(page, date)
                    if result:
                        self.results.append(result)
                        
                    self.retry_queue.task_done()
                    
                except Exception as e:
                    logger.error(f"Retry worker {worker_id} error: {str(e)}")
                    self.retry_queue.task_done()
                    
        finally:
            await page.close()

    async def save_to_db(self, db: any, results: List[Tuple[str, str]], today: datetime.date):
        try:
            for date, slots in results:
                try:
                    date_obj = datetime.strptime(date, "%d/%m/%Y").date()
                    if date_obj >= today:
                        existing_slot = db.query(self.slot_model).filter(
                            self.slot_model.date == date
                        ).first()
                        
                        if existing_slot:
                            existing_slot.slots = slots
                            existing_slot.updated_at = datetime.now()
                        else:
                            new_slot = self.slot_model(
                                date=date,
                                slots=slots
                            )
                            db.add(new_slot)
                except Exception as e:
                    logger.error(f"Error saving date {date}: {str(e)}")
                    continue
                    
            db.commit()
            
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            db.rollback()

    async def scrape(self, start_offset: int = 0):
        db = SessionLocal()
        try:
            # Clean up past dates
            today = datetime.now().date()
            slots_to_delete = db.query(self.slot_model).all()
            for slot in slots_to_delete:
                try:
                    slot_date = datetime.strptime(slot.date, "%d/%m/%Y").date()
                    if slot_date < today:
                        db.delete(slot)
                except Exception:
                    continue
            db.commit()
            
            # Generate dates
            start_date = today + timedelta(days=start_offset)
            dates = [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(self.batch_size)]
            
            batch_start_time = time.time()
            logger.info(f"Processing {self.product_name} dates: {dates[0]} to {dates[-1]}")
            
            # Create queues
            dates_queue = asyncio.Queue()
            for date in dates:
                await dates_queue.put(date)
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                
                context = await browser.new_context(
                    user_agent=random.choice(USER_AGENTS),
                    viewport={'width': 1920, 'height': 1080}
                )
                
                # Start workers
                workers = []
                retry_workers = []
                
                for i in range(self.num_workers):
                    # Add poison pills
                    await dates_queue.put(None)
                    await self.retry_queue.put(None)
                    
                    # Create workers
                    worker = asyncio.create_task(self.worker(context, i, dates_queue))
                    retry_worker = asyncio.create_task(self.retry_worker(context, i))
                    
                    workers.append(worker)
                    retry_workers.append(retry_worker)
                
                # Wait for all work to complete
                await dates_queue.join()
                await self.retry_queue.join()
                
                # Wait for workers to finish
                await asyncio.gather(*workers)
                await asyncio.gather(*retry_workers)
                
                await context.close()
                await browser.close()
                
                # Save results
                if self.results:
                    await self.save_to_db(db, self.results, today)
                    
                batch_time = time.time() - batch_start_time
                logger.info(f"Completed {len(self.results)} {self.product_name} dates in {batch_time:.2f} seconds")
                
        except Exception as e:
            logger.error(f"Scraper error: {str(e)}")
            raise
        finally:
            db.close()

async def scrape_gorilla_slots(start_offset: int = 0):
    scraper = FastScraper(
        slot_model=AvailableSlot,
        product_name="Mountain gorillas"
    )
    await scraper.scrape(start_offset)

async def scrape_golden_monkey_slots(start_offset: int = 0):
    scraper = FastScraper(
        slot_model=GoldenMonkeySlot,
        product_name="Golden Monkeys"
    )
    await scraper.scrape(start_offset)

if __name__ == "__main__":
    # Run both scrapers
    async def main():
        await scrape_gorilla_slots()
        await scrape_golden_monkey_slots()
    
    asyncio.run(main()) 