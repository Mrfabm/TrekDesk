from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..database import get_db, SessionLocal
from ..models.golden_monkey_slots import GoldenMonkeySlot
from ..models.scrape_status import ScrapeStatus
from ..utils.auth import get_current_user
import sys
import os
import logging

logger = logging.getLogger(__name__)

# Allow importing scraper from backend root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from async_golden_monkey import scrape_golden_monkey_slots

router = APIRouter()


def format_relative_time(updated_at):
    """Format the relative time in a human-readable format"""
    if not updated_at:
        return None

    now = datetime.utcnow()
    diff = now - updated_at
    seconds = abs(int(diff.total_seconds()))

    if seconds == 0:
        return "just now"
    elif seconds < 60:
        return f"{seconds} second{'s' if seconds != 1 else ''} ago"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"


@router.get("")
async def get_golden_monkey_slots(
    start_date: str = None,
    end_date: str = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validate and parse date filters
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

        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%d/%m/%Y")
        tomorrow_date = datetime.strptime(tomorrow, "%d/%m/%Y")

        slots = db.query(GoldenMonkeySlot).all()
        filtered_slots = []

        for slot in slots:
            try:
                slot_date = datetime.strptime(slot.date, "%d/%m/%Y")
            except ValueError:
                logger.warning(f"Skipping slot with invalid date format: {slot.date}")
                continue

            if slot_date < tomorrow_date:
                continue

            if start_date_obj and slot_date < start_date_obj:
                continue

            if end_date_obj and slot_date > end_date_obj:
                continue

            filtered_slots.append(slot)

        slot_list = [
            {
                "id": slot.id,
                "date": slot.date,
                "slots": slot.slots,
                "updated_at": slot.updated_at.strftime("%Y-%m-%d %H:%M:%S") if slot.updated_at else None,
                "relative_time": format_relative_time(slot.updated_at)
            }
            for slot in filtered_slots
        ]

        slot_list.sort(key=lambda x: datetime.strptime(x["date"], "%d/%m/%Y"))

        most_recent_update = max(
            (slot.updated_at for slot in filtered_slots if slot.updated_at),
            default=None
        )

        return {
            "slots": slot_list,
            "total": len(slot_list),
            "last_update": format_relative_time(most_recent_update)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching golden monkey slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


async def run_golden_monkey_scrape_with_status(status_record_id: int):
    """Wrapper that runs the scraper and updates ScrapeStatus on completion or failure."""
    db = None
    try:
        db = SessionLocal()
        results = await scrape_golden_monkey_slots()
        slots_found = len(results) if results else 0
        record = db.query(ScrapeStatus).filter(ScrapeStatus.id == status_record_id).first()
        if record:
            record.status = "success"
            record.message = f"Scraped {slots_found} golden monkey slots"
            db.commit()
    except Exception as e:
        logger.error(f"Background golden monkey scrape failed: {str(e)}")
        if db:
            record = db.query(ScrapeStatus).filter(ScrapeStatus.id == status_record_id).first()
            if record:
                record.status = "failed"
                record.message = f"Scraping failed: {str(e)}"
                db.commit()
    finally:
        if db:
            db.close()


@router.post("/trigger-scrape")
async def trigger_golden_monkey_scrape(
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        status_record = ScrapeStatus(
            status="queued",
            message="Golden monkey scraping queued",
            last_run=datetime.utcnow()
        )
        db.add(status_record)
        db.commit()
        db.refresh(status_record)

        background_tasks.add_task(run_golden_monkey_scrape_with_status, status_record.id)

        return {"message": "Golden Monkey slot scraping initiated"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
