import asyncio
from async_panda_headless import scrape_slots
from async_golden_monkey import scrape_golden_monkey_slots
import logging
from datetime import datetime, timedelta
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('scrapers.log')
    ]
)
logger = logging.getLogger(__name__)

async def run_scrapers():
    try:
        logger.info("=== Starting Scraper Process ===")
        
        # Calculate total days to scrape (2 years from tomorrow)
        tomorrow = datetime.now() + timedelta(days=1)
        total_days = 365 * 2
        batch_size = 30
        total_batches = (total_days + batch_size - 1) // batch_size
        
        logger.info(f"Will process {total_days} days starting from {tomorrow.strftime('%d/%m/%Y')} in {total_batches} batches of {batch_size}")
        
        for batch in range(total_batches):
            start_offset = batch * batch_size
            logger.info(f"Processing batch {batch + 1}/{total_batches} (days {start_offset} to {start_offset + batch_size - 1} from tomorrow)")
            
            try:
                # Run gorilla scraper
                logger.info("Starting gorilla scraper...")
                gorilla_start = time.time()
                await scrape_slots(start_offset=start_offset, start_date=tomorrow)
                gorilla_time = time.time() - gorilla_start
                logger.info(f"Completed gorilla slots batch in {gorilla_time:.2f} seconds")
                
                # Wait between scrapers
                logger.info("Waiting 30 seconds before starting monkey scraper...")
                await asyncio.sleep(30)
                
                # Run monkey scraper
                logger.info("Starting golden monkey scraper...")
                monkey_start = time.time()
                await scrape_golden_monkey_slots(start_offset=start_offset, start_date=tomorrow)
                monkey_time = time.time() - monkey_start
                logger.info(f"Completed golden monkey slots batch in {monkey_time:.2f} seconds")
                
                if batch < total_batches - 1:
                    logger.info("Waiting 30 seconds before next batch...")
                    await asyncio.sleep(30)
                    
            except Exception as batch_error:
                logger.error(f"Error in batch {batch + 1}: {str(batch_error)}")
                logger.error("Will continue with next batch")
                continue
        
        logger.info("=== Scraping Process Completed ===")
        
    except Exception as e:
        logger.error(f"Error in run_scrapers: {str(e)}")
        raise

if __name__ == "__main__":
    start_time = time.time()
    asyncio.run(run_scrapers())
    total_time = time.time() - start_time
    logger.info(f"Total scraping time: {total_time:.2f} seconds") 