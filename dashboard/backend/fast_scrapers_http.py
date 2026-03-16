import asyncio
import aiohttp
import ssl
from datetime import datetime, timedelta
import random
import logging
import time
from typing import List, Tuple, Optional, Type, Dict
import json
import certifi
from tabulate import tabulate
from collections import defaultdict
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FastHttpScraper:
    def __init__(self, slot_model: Type, product_id: int, product_name: str, max_concurrent: int = 10):
        self.slot_model = slot_model
        self.product_id = product_id  # 1 for gorillas, 2 for monkeys
        self.product_name = product_name
        self.max_concurrent = max_concurrent
        self.results = []
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session = None
        self.batch_size = 30  # Reduced batch size for stability
        self.timeout = aiohttp.ClientTimeout(total=30, connect=10)
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())
        
    async def init_session(self):
        """Initialize session with proper cookies and headers"""
        conn = aiohttp.TCPConnector(
            ssl=self.ssl_context,
            limit=self.max_concurrent,
            ttl_dns_cache=300,
            force_close=False
        )
        
        self.session = aiohttp.ClientSession(
            connector=conn,
            timeout=self.timeout,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
            }
        )
        
        # Get initial cookies
        try:
            async with self.session.get(
                "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
                allow_redirects=True,
                timeout=self.timeout
            ) as response:
                await response.text()
                await asyncio.sleep(2)  # Increased wait for stability
        except Exception as e:
            logger.error(f"Error initializing session: {str(e)}")
            raise

    async def close_session(self):
        if self.session:
            await self.session.close()
            
    async def get_view_state(self) -> str:
        """Get the JSF view state needed for requests"""
        try:
            async with self.session.get(
                "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
            ) as response:
                text = await response.text()
                # Find viewstate in the HTML
                start = text.find('id="javax.faces.ViewState" value="') + 32
                end = text.find('"', start)
                return text[start:end]
        except Exception as e:
            logger.error(f"Error getting viewstate: {str(e)}")
            return None

    async def check_date(self, date: str, view_state: str) -> Optional[Tuple[str, str]]:
        """Check availability for a single date using direct HTTP request"""
        try:
            async with self.semaphore:
                # First set the site and product with AJAX
                data = {
                    "javax.faces.partial.ajax": "true",
                    "javax.faces.source": "form:visitorAndCategoryDetails_product",
                    "javax.faces.partial.execute": "@all",
                    "javax.faces.partial.render": "@all",
                    "form:visitorAndCategoryDetails_product": str(self.product_id),
                    "form:visitorAndCategoryDetails_site": "1",
                    "form": "form",
                    "javax.faces.ViewState": view_state
                }
                
                headers = {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest"
                }
                
                # Set site and product
                try:
                    async with self.session.post(
                        "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
                        data=data,
                        headers=headers,
                        timeout=self.timeout
                    ) as response:
                        text = await response.text()
                        logger.debug(f"Product selection response: {text[:200]}...")
                        await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Error setting product for date {date}: {str(e)}")
                    return None
                
                # Check date with AJAX
                data = {
                    "javax.faces.partial.ajax": "true",
                    "javax.faces.source": "form:visitorAndCategoryDetails_dateOfVisit",
                    "javax.faces.partial.execute": "@all",
                    "javax.faces.partial.render": "form:visitorAndCategoryDetails_slots form:messages",
                    "form:visitorAndCategoryDetails_dateOfVisit": date,
                    "form:visitorAndCategoryDetails_product": str(self.product_id),
                    "form:visitorAndCategoryDetails_site": "1",
                    "form": "form",
                    "javax.faces.ViewState": view_state
                }
                
                try:
                    async with self.session.post(
                        "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml",
                        data=data,
                        headers=headers,
                        timeout=self.timeout
                    ) as response:
                        text = await response.text()
                        logger.debug(f"Date check response for {date}: {text[:200]}...")
                        
                        # Check for red error message in AJAX response
                        if "No slots available on date selected" in text and '<li class="alert alert-danger">' in text:
                            logger.info(f"Found Sold Out for date {date}")
                            return date, "Sold Out"
                        
                        # Look for slots in AJAX response
                        if '<update id="form:visitorAndCategoryDetails_slots">' in text:
                            slots_start = text.find('<update id="form:visitorAndCategoryDetails_slots">') + 46
                            slots_end = text.find('</update>', slots_start)
                            slots_html = text[slots_start:slots_end]
                            
                            if '<select' in slots_html:
                                # Extract option values
                                slots = []
                                option_start = 0
                                while True:
                                    option_start = slots_html.find('<option value="', option_start)
                                    if option_start == -1:
                                        break
                                    value_start = option_start + 15
                                    value_end = slots_html.find('"', value_start)
                                    slot = slots_html[value_start:value_end]
                                    if slot and slot != "":
                                        slots.append(slot)
                                    option_start = value_end
                                
                                if slots:
                                    logger.info(f"Found slots for date {date}: {slots}")
                                    return date, ", ".join(slots)
                        
                        logger.debug(f"No slots or error found for date {date}, will retry")
                        return None
                        
                except Exception as e:
                    logger.error(f"Error checking slots for date {date}: {str(e)}")
                    return None
            
            return None
        except Exception as e:
            logger.error(f"Error in check_date for {date}: {str(e)}")
            return None

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
            
            # Initialize session
            await self.init_session()
            
            # Get view state
            view_state = await self.get_view_state()
            if not view_state:
                logger.error("Failed to get view state")
                return
            
            # Process dates in smaller chunks
            chunk_size = 5
            for i in range(0, len(dates), chunk_size):
                chunk = dates[i:i + chunk_size]
                tasks = [self.check_date(date, view_state) for date in chunk]
                chunk_results = await asyncio.gather(*tasks)
                self.results.extend([r for r in chunk_results if r])
                await asyncio.sleep(2)  # Wait between chunks
            
            # Save results
            if self.results:
                await self.save_to_db(db, self.results, today)
                
            batch_time = time.time() - batch_start_time
            logger.info(f"Completed {len(self.results)} {self.product_name} dates in {batch_time:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Scraper error: {str(e)}")
            raise
        finally:
            await self.close_session()
            db.close()

async def scrape_gorilla_slots(start_offset: int = 0):
    scraper = FastHttpScraper(
        slot_model=AvailableSlot,
        product_id=1,
        product_name="Mountain gorillas"
    )
    await scraper.scrape(start_offset)

async def scrape_golden_monkey_slots(start_offset: int = 0):
    scraper = FastHttpScraper(
        slot_model=GoldenMonkeySlot,
        product_id=2,
        product_name="Golden Monkeys"
    )
    await scraper.scrape(start_offset)

async def run_scrapers():
    """Run both gorilla and golden monkey scrapers and update database"""
    try:
        # Import models here to avoid circular imports
        from app.models.available_slots import AvailableSlot
        from app.models.golden_monkey_slots import GoldenMonkeySlot
        
        # Run gorilla scraper
        gorilla_scraper = FastHttpScraper(AvailableSlot, 1, "Mountain Gorillas")
        await gorilla_scraper.init_session()
        await gorilla_scraper.scrape()
        await gorilla_scraper.close_session()
        
        # Wait a bit before starting monkey scraper
        await asyncio.sleep(5)
        
        # Run golden monkey scraper
        monkey_scraper = FastHttpScraper(GoldenMonkeySlot, 2, "Golden Monkeys")
        await monkey_scraper.init_session()
        await monkey_scraper.scrape()
        await monkey_scraper.close_session()
        
        logger.info("Successfully completed both scraper runs")
        return True
        
    except Exception as e:
        logger.error(f"Error running scrapers: {str(e)}")
        return False

if __name__ == "__main__":
    # Import models here to avoid circular imports
    from app.models.available_slots import AvailableSlot
    from app.models.golden_monkey_slots import GoldenMonkeySlot
    asyncio.run(run_scrapers()) 