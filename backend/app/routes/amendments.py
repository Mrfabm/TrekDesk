from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date as DateType
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.amendment import AmendmentRequest, AmendmentFeeType, AmendmentStatus
from ..utils.auth import get_current_user
from .notifications import create_simple_notification

router = APIRouter()


class AmendmentRequestBody(BaseModel):
    requested_date: DateType
    reason: str = None


def _calc_fee(booking: Booking, new_date: DateType) -> tuple[AmendmentFeeType, float]:
    unit_cost = float(booking.product_rel.unit_cost) if booking.product_rel else 0
    total = unit_cost * (booking.people or 0)
    if new_date.year == booking.date.year:
        return AmendmentFeeType.SAME_YEAR_20PCT, round(total * 0.20, 2)
    return AmendmentFeeType.NEXT_YEAR_FULL, round(total, 2)


@router.post("/request/{booking_id}")
async def request_amendment(
    booking_id: int,
    body: AmendmentRequestBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Users can only amend their own bookings; admins can amend any
    if current_user.role == UserRole.USER and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in [UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed_statuses = [
        BookingStatus.CONFIRMED, BookingStatus.SECURED_DEPOSIT,
        BookingStatus.SECURED_FULL, BookingStatus.SECURED_AUTHORIZATION,
    ]
    if booking.booking_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Booking cannot be amended in its current status")

    if not booking.date:
        raise HTTPException(status_code=400, detail="Booking has no trek date set")

    fee_type, fee_amount = _calc_fee(booking, body.requested_date)

    amendment = AmendmentRequest(
        booking_id=booking.id,
        original_date=booking.date,
        requested_date=body.requested_date,
        reason=body.reason,
        fee_type=fee_type,
        fee_amount=fee_amount,
        requested_by=current_user.id,
    )
    db.add(amendment)
    booking.booking_status = BookingStatus.AMENDMENT_REQUESTED
    db.flush()

    from ..services.email_service import email_amendment_requested
    # Notify admin + finance
    fee_label = "20% of permit cost" if fee_type == AmendmentFeeType.SAME_YEAR_20PCT else "full permit cost (new year)"
    original_date_str = str(booking.date) if booking.date else "unknown"
    admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
    for admin in admins:
        create_simple_notification(
            db, admin.id, "Amendment Requested",
            f"Booking '{booking.booking_name}' — date change to {body.requested_date}. "
            f"Amendment fee: ${fee_amount:.2f} ({fee_label})."
        )
        if admin.email:
            email_amendment_requested(
                admin.email, booking.booking_name,
                original_date_str, str(body.requested_date),
                fee_amount, fee_type.value
            )
    finance_users = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
    for fu in finance_users:
        create_simple_notification(
            db, fu.id, "Amendment Fee Due",
            f"Booking '{booking.booking_name}' amendment fee of ${fee_amount:.2f} is pending receipt."
        )

    db.commit()
    return {
        "amendment_id": amendment.id,
        "fee_type": fee_type.value,
        "fee_amount": fee_amount,
        "message": f"Amendment requested. Fee of ${fee_amount:.2f} must be paid before admin can confirm.",
    }


@router.post("/{amendment_id}/confirm-fee-paid")
async def confirm_fee_paid(
    amendment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.FINANCE_ADMIN:
        raise HTTPException(status_code=403, detail="Only finance can confirm fee receipt")

    amendment = db.query(AmendmentRequest).filter(AmendmentRequest.id == amendment_id).first()
    if not amendment:
        raise HTTPException(status_code=404, detail="Amendment not found")
    if amendment.status != AmendmentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Amendment is not pending")

    amendment.status = AmendmentStatus.FEE_PAID
    amendment.fee_confirmed_by = current_user.id

    admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
    for admin in admins:
        create_simple_notification(
            db, admin.id, "Amendment Fee Received",
            f"Amendment fee for booking '{amendment.booking.booking_name}' has been received. Please confirm the amendment."
        )
    db.commit()
    return {"status": "fee_paid", "message": "Fee confirmed — admin can now finalise the amendment"}


@router.post("/{amendment_id}/confirm")
async def confirm_amendment(
    amendment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can confirm amendments")

    amendment = db.query(AmendmentRequest).filter(AmendmentRequest.id == amendment_id).first()
    if not amendment:
        raise HTTPException(status_code=404, detail="Amendment not found")
    if amendment.status != AmendmentStatus.FEE_PAID:
        raise HTTPException(status_code=400, detail="Fee must be confirmed paid before amendment can be confirmed")

    amendment.status = AmendmentStatus.CONFIRMED
    amendment.confirmed_by = current_user.id

    booking = amendment.booking
    booking.date = amendment.requested_date
    booking.trekking_date = amendment.requested_date
    booking.booking_status = BookingStatus.CONFIRMED

    create_simple_notification(
        db, booking.user_id, "Amendment Confirmed",
        f"Your booking '{booking.booking_name}' has been amended to {amendment.requested_date}."
    )
    db.commit()
    return {"message": "Amendment confirmed — booking date updated"}


@router.post("/{amendment_id}/reject")
async def reject_amendment(
    amendment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can reject amendments")

    amendment = db.query(AmendmentRequest).filter(AmendmentRequest.id == amendment_id).first()
    if not amendment:
        raise HTTPException(status_code=404, detail="Amendment not found")

    amendment.status = AmendmentStatus.REJECTED
    amendment.confirmed_by = current_user.id
    amendment.booking.booking_status = BookingStatus.CONFIRMED  # Revert to confirmed

    create_simple_notification(
        db, amendment.booking.user_id, "Amendment Rejected",
        f"Your amendment request for booking '{amendment.booking.booking_name}' has been rejected."
    )
    db.commit()
    return {"message": "Amendment rejected"}


@router.get("/pending")
async def get_pending_amendments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    amendments = db.query(AmendmentRequest).filter(
        AmendmentRequest.status.in_([AmendmentStatus.PENDING, AmendmentStatus.FEE_PAID])
    ).all()
    return [{
        "id": a.id,
        "booking_id": a.booking_id,
        "booking_name": a.booking.booking_name,
        "original_date": a.original_date,
        "requested_date": a.requested_date,
        "fee_type": a.fee_type.value,
        "fee_amount": float(a.fee_amount),
        "status": a.status.value,
        "reason": a.reason,
    } for a in amendments]
