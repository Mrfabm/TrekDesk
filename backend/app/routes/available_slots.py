from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models.available_slots import AvailableSlot
from ..models.scrape_status import ScrapeStatus
from ..utils.auth import get_current_user
from async_panda_headless import scrape_slots

router = APIRouter()

class SlotData(BaseModel):
    date: str
    slots: str

@router.get("")
async def get_available_slots(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get the latest scrape status
        latest_status = db.query(ScrapeStatus)\
            .order_by(ScrapeStatus.last_run.desc())\
            .first()
            
        # Get all slots and convert dates for sorting
        slots = db.query(AvailableSlot).all()
        
        # Convert to list for sorting
        slot_list = [
            {
                "id": slot.id,
                "date": slot.date,
                "slots": slot.slots,
                "created_at": slot.created_at,
                "updated_at": slot.updated_at
            } for slot in slots
        ]
        
        # Sort by date
        slot_list.sort(key=lambda x: datetime.strptime(x["date"], "%d/%m/%Y"))
        
        response_data = {
            "slots": slot_list,
            "last_update": latest_status.last_run if latest_status else None,
            "status": latest_status.status if latest_status else "unknown"
        }
        
        print("API Response:", response_data)  # Debug log
        return response_data
        
    except Exception as e:
        print("API Error:", str(e))  # Debug log
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

@router.post("/trigger-slot-scrape")
async def trigger_slot_scrape(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        print("Starting slot scrape trigger...")  # Debug log
        
        # Create initial status record
        status_record = ScrapeStatus(
            status="queued",
            message="Scraping queued",
            last_run=datetime.utcnow()  # Make sure this is set
        )
        db.add(status_record)
        db.commit()
        print("Created status record")  # Debug log

        # Add scraping task to background tasks
        try:
            print("Adding scrape task to background tasks...")  # Debug log
            background_tasks.add_task(scrape_slots)
            print("Successfully added scrape task")  # Debug log
        except Exception as task_error:
            print(f"Error adding task: {task_error}")  # Debug log
            raise
        
        return {"message": "Slot scraping initiated"}
    except Exception as e:
        print(f"Error in trigger_slot_scrape: {e}")  # Debug log
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