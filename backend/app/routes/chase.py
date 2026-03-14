from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.chase import ChaseRecord, ChaseStatus
from ..utils.auth import get_current_user
from .notifications import create_simple_notification

router = APIRouter()


@router.get("")
async def get_chase_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active chase records — admin/finance/superuser only."""
    allowed = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    records = (
        db.query(ChaseRecord)
        .filter(ChaseRecord.status == ChaseStatus.ACTIVE)
        .all()
    )
    result = []
    for r in records:
        b = r.booking
        result.append({
            "chase_id": r.id,
            "booking_id": b.id,
            "booking_name": b.booking_name,
            "booking_ref": b.booking_ref,
            "date": b.date,
            "agent": b.user.username if b.user else None,
            "chase_count": r.chase_count,
            "last_chase_at": r.last_chase_at,
            "next_chase_at": r.next_chase_at,
            "status": r.status.value,
        })
    return result


@router.post("/{chase_id}/resolve")
async def resolve_chase(
    chase_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin resolves a chase manually — payment eventually arrived.
    Booking moves back to CONFIRMED so finance can validate.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can resolve chases")

    record = db.query(ChaseRecord).filter(ChaseRecord.id == chase_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Chase record not found")
    if record.status != ChaseStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Chase is not active")

    record.status = ChaseStatus.RESOLVED
    record.booking.booking_status = BookingStatus.CONFIRMED

    create_simple_notification(
        db, record.booking.user_id, "Booking Reinstated",
        f"Your booking '{record.booking.booking_name}' has been reinstated. Finance will now validate your payment."
    )
    db.commit()
    return {"message": "Chase resolved — booking returned to confirmed for payment validation"}
