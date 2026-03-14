from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.cancellation import CancellationRequest, CancellationStatus
from ..utils.auth import get_current_user
from .notifications import create_simple_notification
from datetime import datetime

router = APIRouter()


class CancellationBody(BaseModel):
    reason: str = None


@router.post("/request/{booking_id}")
async def request_cancellation(
    booking_id: int,
    body: CancellationBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == UserRole.USER and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in [UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    non_cancellable = [BookingStatus.CANCELLED, BookingStatus.RELEASED, BookingStatus.CANCELLATION_REQUESTED]
    if booking.booking_status in non_cancellable:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled in its current status")

    cancellation = CancellationRequest(
        booking_id=booking.id,
        reason=body.reason,
        requested_by=current_user.id,
    )
    db.add(cancellation)
    booking.booking_status = BookingStatus.CANCELLATION_REQUESTED
    db.flush()

    admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
    for admin in admins:
        create_simple_notification(
            db, admin.id, "Cancellation Requested",
            f"Booking '{booking.booking_name}' — cancellation requested by {current_user.username}. "
            f"Note: permits are non-refundable and non-transferable."
        )
    db.commit()
    return {"id": cancellation.id, "status": "pending", "message": "Cancellation request submitted. Admin will confirm shortly."}


@router.post("/{cancellation_id}/confirm")
async def confirm_cancellation(
    cancellation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can confirm cancellations")

    cancellation = db.query(CancellationRequest).filter(CancellationRequest.id == cancellation_id).first()
    if not cancellation:
        raise HTTPException(status_code=404, detail="Cancellation request not found")
    if cancellation.status != CancellationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cancellation is not pending")

    cancellation.status = CancellationStatus.CONFIRMED
    cancellation.confirmed_by = current_user.id
    cancellation.admin_notes = (
        f"Non-refundable. Cancelled by {current_user.username} on {datetime.utcnow().strftime('%Y-%m-%d')}."
    )

    booking = cancellation.booking
    booking.booking_status = BookingStatus.CANCELLED
    # Payment record is intentionally preserved for audit purposes

    create_simple_notification(
        db, booking.user_id, "Booking Cancelled",
        f"Your booking '{booking.booking_name}' has been cancelled. "
        f"Please note: permits are non-refundable and non-transferable."
    )
    db.commit()
    return {"message": "Cancellation confirmed — booking cancelled, payment record preserved"}


@router.post("/{cancellation_id}/reject")
async def reject_cancellation(
    cancellation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can reject cancellations")

    cancellation = db.query(CancellationRequest).filter(CancellationRequest.id == cancellation_id).first()
    if not cancellation:
        raise HTTPException(status_code=404, detail="Cancellation request not found")
    if cancellation.status != CancellationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cancellation is not pending")

    cancellation.status = CancellationStatus.REJECTED
    cancellation.confirmed_by = current_user.id
    cancellation.booking.booking_status = BookingStatus.CONFIRMED  # Revert

    create_simple_notification(
        db, cancellation.booking.user_id, "Cancellation Rejected",
        f"Your cancellation request for booking '{cancellation.booking.booking_name}' has been rejected."
    )
    db.commit()
    return {"message": "Cancellation rejected — booking reinstated"}


@router.get("/pending")
async def get_pending_cancellations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    cancellations = db.query(CancellationRequest).filter(
        CancellationRequest.status == CancellationStatus.PENDING
    ).all()
    return [{
        "id": c.id,
        "booking_id": c.booking_id,
        "booking_name": c.booking.booking_name,
        "booking_ref": c.booking.booking_ref,
        "date": c.booking.date,
        "reason": c.reason,
        "requested_by": c.requester.username if c.requester else None,
        "created_at": c.created_at,
    } for c in cancellations]
