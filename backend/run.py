import asyncio
import uvicorn
import logging
from datetime import datetime
from app.main import app
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from run_scrapers import run_scrapers  # Import the correct function

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create scheduler
scheduler = AsyncIOScheduler()

async def scheduled_scrape():
    """Run scrapers and log the result"""
    logger.info(f"Starting scheduled scrape at {datetime.now()}")
    try:
        await run_scrapers()  # Use the correct function
        logger.info("Scheduled scrape completed successfully")
    except Exception as e:
        logger.error(f"Scheduled scrape failed: {str(e)}")

def start_scheduler():
    """Start the scheduler with a 30-minute interval"""
    scheduler.add_job(
        scheduled_scrape,
        trigger=IntervalTrigger(minutes=30),
        next_run_time=datetime.now()  # Run immediately on startup
    )
    scheduler.start()
    logger.info("Scheduler started - will scrape every 30 minutes")

if __name__ == "__main__":
    # Start the scheduler
    start_scheduler()
    
    # Run the FastAPI server
    uvicorn.run(
        "app.main:app",  # Use string format for reload to work properly
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 