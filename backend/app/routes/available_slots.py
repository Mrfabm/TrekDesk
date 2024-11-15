from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models.available_slots import AvailableSlot
from ..utils.auth import get_current_user

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
        slots = db.query(AvailableSlot).order_by(AvailableSlot.date).all()
        return [{"id": slot.id, "date": slot.date, "slots": slot.slots, 
                "created_at": slot.created_at, "updated_at": slot.updated_at} 
                for slot in slots]
    except Exception as e:
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