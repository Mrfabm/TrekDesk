from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.payment import Payment, PaymentStatus, ValidationStatus
from ..models.site import Site, Product
from ..utils.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime, timedelta
from decimal import Decimal
from .notifications import create_simple_notification

router = APIRouter()

class PaymentUpdate(BaseModel):
    booking_id: int
    amount_received: float
    validation_status: str
    validation_notes: str = None

@router.get("/payment-status/{booking_id}")
async def get_payment_status(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.FINANCE_ADMIN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only finance admins and admins can view payment details"
        )
    
    booking = (
        db.query(Booking)
        .join(Site)
        .join(Product)
        .join(Payment, isouter=True)
        .filter(Booking.id == booking_id)
        .first()
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {
        "booking_name": booking.booking_name,
        "product": booking.product,
        "number_of_people": booking.people,
        "unit_cost": float(booking.product_rel.unit_cost) if booking.product_rel else 0,
        "total_amount": float(booking.product_rel.unit_cost * booking.people) if booking.product_rel and booking.people else 0,
        "amount_received": float(booking.payment.deposit_paid) if booking.payment else 0,
        "validation_status": booking.payment.validation_status.value if booking.payment else "pending",
        "validation_notes": booking.payment.validation_notes if booking.payment else "",
        "created_at": booking.created_at
    }

@router.post("/validate-payment")
async def validate_payment(
    payment_data: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role not in [UserRole.FINANCE_ADMIN, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only finance admins and admins can validate payments"
            )

        booking = (
            db.query(Booking)
            .filter(Booking.id == payment_data.booking_id)
            .first()
        )
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        # Validate the validation status
        if payment_data.validation_status not in [status.value for status in ValidationStatus]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid validation status. Must be one of: {[status.value for status in ValidationStatus]}"
            )
        
        # Get or create payment record
        payment = db.query(Payment).filter(Payment.booking_id == payment_data.booking_id).first()
        if not payment:
            payment = Payment(booking_id=payment_data.booking_id)
            db.add(payment)
        
        # Update payment details
        payment.deposit_paid = Decimal(str(payment_data.amount_received))
        payment.validation_status = ValidationStatus(payment_data.validation_status)
        payment.validation_notes = payment_data.validation_notes
        payment.validated_by = current_user.id
        payment.validated_at = datetime.utcnow()
        
        total_amount = (float(booking.product_rel.unit_cost) * booking.people
                        if booking.product_rel and booking.people else 0)

        # Calculate payment status based on amount received
        if payment.deposit_paid >= total_amount:
            payment.payment_status = PaymentStatus.FULLY_PAID
        elif payment.deposit_paid > 0:
            payment.payment_status = PaymentStatus.DEPOSIT_PAID
        else:
            payment.payment_status = PaymentStatus.PENDING

        from ..services.email_service import (
            email_payment_validated_ok, email_payment_do_not_purchase
        )
        ok_statuses = {ValidationStatus.OK_TO_PURCHASE_FULL, ValidationStatus.OK_TO_PURCHASE_DEPOSIT}
        validation_enum = ValidationStatus(payment_data.validation_status)

        if validation_enum in ok_statuses:
            # Payment received — booking stays CONFIRMED, admin will purchase permits
            booking.booking_status = BookingStatus.CONFIRMED
            create_simple_notification(
                db, booking.user_id, "Payment Validated",
                f"Payment for your booking '{booking.booking_name}' has been validated. Permits will be purchased shortly."
            )
            # Passport check — mandatory for full payment, warn for deposit
            if validation_enum == ValidationStatus.OK_TO_PURCHASE_FULL:
                from ..models.passport_data import PassportData
                passport_count = db.query(PassportData).filter(PassportData.booking_id == booking.id).count()
                expected = booking.people or 1
                if passport_count < expected:
                    missing = expected - passport_count
                    create_simple_notification(
                        db, booking.user_id, "⚠ Passport Copies Required — Immediate Action",
                        f"Full payment confirmed for '{booking.booking_name}'. Passport copies are mandatory before permits can be purchased. "
                        f"Please upload {missing} missing passport(s) via Passport Management immediately."
                    )
            # Notify admins to proceed
            admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
            for admin in admins:
                create_simple_notification(
                    db, admin.id, "Ready to Purchase Permits",
                    f"Booking '{booking.booking_name}' payment validated ({payment_data.validation_status}). Proceed with permit purchase."
                )
            # Email the agent
            if booking.user and booking.user.email:
                email_payment_validated_ok(
                    booking.user.email, booking.booking_name,
                    float(payment.deposit_paid or 0), payment_data.validation_status
                )
        else:
            # do_not_purchase — no payment received; route based on agent/client trust level.
            # AgentClient trust takes priority; fall back to internal user trust for legacy bookings.
            ac = booking.agent_client_rel
            agent = booking.user
            is_trusted = (
                (ac is not None and (ac.is_trusted or ac.has_rolling_deposit))
                or (ac is None and agent is not None and (agent.is_trusted_agent or agent.has_rolling_deposit))
            )
            trusted_label = (ac.name if ac else (agent.username if agent else "agent"))
            if is_trusted:
                # Trusted path — submit authorization request with proof
                booking.booking_status = BookingStatus.AWAITING_AUTHORIZATION
                create_simple_notification(
                    db, booking.user_id, "Authorization Required",
                    f"No payment received for booking '{booking.booking_name}'. Please submit an authorization request with proof of incoming payment."
                )
                admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
                for admin in admins:
                    create_simple_notification(
                        db, admin.id, "Booking Awaiting Authorization",
                        f"Booking '{booking.booking_name}' for {trusted_label} has no payment. Routed to authorization (trusted agent/client)."
                    )
            else:
                # Untrusted path — start chase system
                from ..models.chase import ChaseRecord, ChaseStatus
                booking.booking_status = BookingStatus.CHASE
                existing_chase = db.query(ChaseRecord).filter(ChaseRecord.booking_id == booking.id).first()
                if not existing_chase:
                    chase = ChaseRecord(
                        booking_id=booking.id,
                        chase_count=1,
                        last_chase_at=datetime.utcnow(),
                        next_chase_at=datetime.utcnow() + timedelta(days=7),
                        status=ChaseStatus.ACTIVE,
                    )
                    db.add(chase)
                create_simple_notification(
                    db, booking.user_id, "Payment Overdue — Action Required",
                    f"No payment received for booking '{booking.booking_name}'. This is chase attempt 1 of 5. Please arrange payment within 7 days or the booking will be released."
                )
                admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN])).all()
                for admin in admins:
                    create_simple_notification(
                        db, admin.id, "Booking Entered Chase",
                        f"Booking '{booking.booking_name}' has no payment. Chase system started (1/5)."
                    )
            # Email the internal user regardless of trust path
            if agent and agent.email:
                email_payment_do_not_purchase(
                    agent.email, booking.booking_name,
                    is_trusted=is_trusted
                )

        db.commit()

        return {
            "validation_status": payment_data.validation_status,
            "payment_status": payment.payment_status.value,
            "amount_received": float(payment.deposit_paid),
            "total_amount": float(total_amount),
            "booking_status": booking.booking_status.value,
        }
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/pending-validations")
async def get_pending_validations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FINANCE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only finance admins can access payment validations"
        )
    
    # All confirmed bookings where payment has not yet been validated by finance
    bookings = (
        db.query(Booking)
        .join(Payment)
        .filter(
            Booking.booking_status.in_([BookingStatus.CONFIRMED, BookingStatus.VR]),
            Payment.validation_status == ValidationStatus.PENDING,
        )
        .all()
    )
    
    return [{
        "booking_id": booking.id,
        "booking_name": booking.booking_name,
        "product": booking.product,
        "date": booking.date,
        "number_of_people": booking.people,
        "payment_status": booking.payment.payment_status.value,
        "amount": float(booking.payment.amount or 0) if booking.payment.amount is not None else 0,
        "balance_due": float(booking.payment.balance_due or 0) if booking.payment.balance_due is not None else 0,
        "deposit_due_date": booking.payment.deposit_due_date,
    } for booking in bookings]

@router.get("/overdue-payments")
async def get_overdue_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FINANCE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only finance admins can view overdue payments"
        )
    
    now = datetime.utcnow()
    overdue_bookings = (
        db.query(Booking)
        .join(Payment)
        .filter(
            ((Payment.payment_status == PaymentStatus.DEPOSIT_PAID) & (Payment.balance_due_date < now)) |
            ((Payment.payment_status == PaymentStatus.PENDING) & (Payment.deposit_due_date < now))
        )
        .all()
    )
    
    return [{
        "booking_id": booking.id,
        "booking_name": booking.booking_name,
        "product": booking.product,
        "payment_status": booking.payment.payment_status.value,
        "amount_due": float(booking.payment.balance_due or 0) if booking.payment.balance_due is not None else 0,
        "due_date": booking.payment.balance_due_date
    } for booking in overdue_bookings] 