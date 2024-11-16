import asyncio
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from async_panda_headless import scrape_slots
import uvicorn
from app.database import Base, engine
from main import app
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)

scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global scheduler
    scheduler = AsyncIOScheduler()
    
    try:
        logger.info("Initializing scheduler...")
        # Run initial scrape
        logger.info("Running initial scrape...")
        await scrape_slots()
        
        # Schedule recurring scrapes
        scheduler.add_job(
            scrape_slots,
            trigger=IntervalTrigger(minutes=10),
            id='scrape_slots',
            name='Scrape available slots every 10 minutes',
            replace_existing=True,
            misfire_grace_time=None,
            max_instances=1,
            coalesce=True
        )
        
        scheduler.start()
        logger.info("Scheduler started successfully")
        yield
    except Exception as e:
        logger.error(f"Error initializing scheduler: {e}")
        yield
    finally:
        # Shutdown
        if scheduler:
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()

app.router.lifespan_context = lifespan

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 