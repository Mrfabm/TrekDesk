from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.golden_monkey_slots import GoldenMonkeySlot
from ..utils.auth import get_current_user
from async_golden_monkey import scrape_golden_monkey_slots

router = APIRouter()

@router.get("")
async def get_golden_monkey_slots(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get all slots
        slots = db.query(GoldenMonkeySlot).all()
        
        # Convert to list with database timestamps
        slot_list = [
            {
                "id": slot.id,
                "date": slot.date,
                "slots": slot.slots,
                "updated_at": slot.updated_at.strftime("%Y-%m-%d %H:%M:%S") if slot.updated_at else None
            } for slot in slots
        ]
        
        # Sort by date
        slot_list.sort(key=lambda x: datetime.strptime(x["date"], "%d/%m/%Y"))
        
        return {
            "slots": slot_list,
            "last_update": slots[0].updated_at if slots else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/trigger-scrape")
async def trigger_golden_monkey_scrape(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        background_tasks.add_task(scrape_golden_monkey_slots)
        return {"message": "Golden Monkey slot scraping initiated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 