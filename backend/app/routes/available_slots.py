from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db
from ..models.available_slots import AvailableSlot
from ..models.golden_monkey_slots import GoldenMonkeySlot
from ..models.scrape_status import ScrapeStatus
from ..utils.auth import get_current_user
from async_panda_headless import scrape_slots
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class SlotData(BaseModel):
    date: str
    slots: str

def format_relative_time(updated_at):
    """Format the relative time in a human-readable format"""
    if not updated_at:
        return None
        
    now = datetime.utcnow()
    diff = now - updated_at
    
    # Get absolute seconds and handle any time synchronization issues
    seconds = abs(int(diff.total_seconds()))
    
    if seconds == 0:
        return "just now"
    elif seconds < 60:
        return f"{seconds} second{'s' if seconds != 1 else ''} ago"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:  # 24 hours
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"

@router.get("")
async def get_available_slots(
    start_date: str = None,
    end_date: str = None,
    slot_type: str = "gorilla",
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Fetching slots for type: {slot_type} from {start_date} to {end_date}")
        
        # Choose model based on slot type
        Model = AvailableSlot if slot_type == "gorilla" else GoldenMonkeySlot
        query = db.query(Model)
        
        # Get tomorrow's date in DD/MM/YYYY format
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%d/%m/%Y")
        
        # Parse and validate date filters
        try:
            start_date_obj = datetime.strptime(start_date, "%d/%m/%Y") if start_date else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Expected DD/MM/YYYY")

        try:
            end_date_obj = datetime.strptime(end_date, "%d/%m/%Y") if end_date else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Expected DD/MM/YYYY")

        if start_date_obj and end_date_obj and start_date_obj > end_date_obj:
            raise HTTPException(status_code=400, detail="start_date must be before end_date")

        # Get all slots first
        slots = query.all()
        filtered_slots = []
        tomorrow_date = datetime.strptime(tomorrow, "%d/%m/%Y")

        for slot in slots:
            # Convert date strings to datetime objects for comparison
            slot_date = datetime.strptime(slot.date, "%d/%m/%Y")

            # Skip if date is before tomorrow
            if slot_date < tomorrow_date:
                continue

            # Apply date range filters if provided
            if start_date_obj and slot_date < start_date_obj:
                continue

            if end_date_obj and slot_date > end_date_obj:
                continue

            filtered_slots.append(slot)
        
        logger.info(f"Found {len(filtered_slots)} {slot_type} slots")
        
        # Convert to list with database timestamps
        slot_list = [
            {
                "id": slot.id,
                "date": slot.date,
                "slots": slot.slots,
                "updated_at": slot.updated_at.strftime("%Y-%m-%d %H:%M:%S") if slot.updated_at else None,
                "relative_time": format_relative_time(slot.updated_at)
            } for slot in filtered_slots
        ]
        
        # Sort by date
        slot_list.sort(key=lambda x: datetime.strptime(x["date"], "%d/%m/%Y"))
        
        # Get the most recent update time from all slots
        most_recent_update = max((slot.updated_at for slot in filtered_slots), default=None)
        
        return {
            "slots": slot_list,
            "total": len(slot_list),
            "last_update": format_relative_time(most_recent_update)
        }
        
    except Exception as e:
        logger.error(f"Error fetching {slot_type} slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("")
async def create_or_update_slots(
    slots_data: List[dict],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        for slot in slots_data:
            existing_slot = db.query(AvailableSlot).filter(
                AvailableSlot.date == slot['Date']
            ).first()
            
            if existing_slot:
                existing_slot.slots = slot['Attendance']
                existing_slot.updated_at = datetime.utcnow()
            else:
                new_slot = AvailableSlot(
                    date=slot['Date'],
                    slots=slot['Attendance']
                )
                db.add(new_slot)
        
        db.commit()
        return {"message": "Slots updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/status")
async def get_scrape_status(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    last_status = db.query(ScrapeStatus).order_by(ScrapeStatus.last_run.desc()).first()
    slots_count = db.query(AvailableSlot).count()
    return {
        "last_run": last_status.last_run if last_status else None,
        "status": last_status.status if last_status else "never_run",
        "message": last_status.message if last_status else None,
        "slots_count": slots_count
    }

async def run_scrape_with_status(status_record_id: int):
    """Wrapper that runs the scraper and updates ScrapeStatus on completion or failure."""
    db = None
    try:
        from ..database import SessionLocal
        db = SessionLocal()
        results = await scrape_slots()
        slots_found = len(results) if results else 0
        record = db.query(ScrapeStatus).filter(ScrapeStatus.id == status_record_id).first()
        if record:
            record.status = "success"
            record.message = f"Scraped {slots_found} slots"
            db.commit()
    except Exception as e:
        logger.error(f"Background scrape failed: {str(e)}")
        if db:
            record = db.query(ScrapeStatus).filter(ScrapeStatus.id == status_record_id).first()
            if record:
                record.status = "failed"
                record.message = f"Scraping failed: {str(e)}"
                db.commit()
    finally:
        if db:
            db.close()


@router.post("/trigger-slot-scrape")
async def trigger_slot_scrape(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Create initial status record
        status_record = ScrapeStatus(
            status="queued",
            message="Scraping queued",
            last_run=datetime.utcnow()
        )
        db.add(status_record)
        db.commit()
        db.refresh(status_record)

        background_tasks.add_task(run_scrape_with_status, status_record.id)

        return {"message": "Slot scraping initiated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/test-scrape")
async def test_scrape(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test endpoint to run scraping directly"""
    try:
        print("Starting direct scrape test...")
        
        # Create status record
        status_record = ScrapeStatus(
            status="running",
            message="Starting scrape",
            last_run=datetime.utcnow()
        )
        db.add(status_record)
        db.commit()
        print("Created status record")

        try:
            # Run scraping
            print("Calling scrape_slots function...")
            results = await scrape_slots()
            print(f"Scraping completed with {len(results) if results else 0} results")
            
            if not results:
                raise Exception("No results returned from scraping")
            
            # Update status
            status_record.status = "success"
            status_record.message = f"Found {len(results)} slots"
            db.commit()
            print("Updated status to success")

            return {"message": "Scraping completed successfully", "slots_found": len(results)}
        except Exception as scrape_error:
            print(f"Detailed scraping error: {str(scrape_error)}")
            if 'status_record' in locals():
                status_record.status = "failed"
                status_record.message = f"Scraping failed: {str(scrape_error)}"
                db.commit()
            raise scrape_error
            
    except Exception as e:
        print(f"Error in test scrape: {str(e)}")
        if 'status_record' in locals():
            status_record.status = "failed"
            status_record.message = str(e)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scraping failed: {str(e)}"
        ) 

@router.post("/trigger-scrape")
async def trigger_scrape(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger the scraper"""
    try:
        logger.info("Manually triggering scraper")
        from run_scrapers import run_scrapers
        
        # Run the scraper
        await run_scrapers()
        
        # Count slots after scraping
        gorilla_count = db.query(AvailableSlot).count()
        monkey_count = db.query(GoldenMonkeySlot).count()
        
        return {
            "message": "Scraping completed",
            "gorilla_slots": gorilla_count,
            "monkey_slots": monkey_count
        }
        
    except Exception as e:
        logger.error(f"Error triggering scrape: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 