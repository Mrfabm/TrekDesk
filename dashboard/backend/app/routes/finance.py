from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.payment import Payment, PaymentStatus, ValidationStatus
from ..models.site import Site, Product
from ..utils.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from .notifications import create_notification

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
    if current_user.role != UserRole.FINANCE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only finance admins can view payment details"
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
        "product": booking.product.name,
        "number_of_people": booking.number_of_people,
        "unit_cost": float(booking.product.unit_cost),
        "total_amount": float(booking.product.unit_cost * booking.number_of_people),
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
        if current_user.role != UserRole.FINANCE_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only finance admins can validate payments"
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
        payment.validation_status = payment_data.validation_status
        payment.validation_notes = payment_data.validation_notes
        payment.validated_by = current_user.id
        payment.validated_at = datetime.utcnow()
        
        # Update booking status to confirmed
        booking.status = BookingStatus.CONFIRMED
        
        # Calculate payment status
        total_amount = booking.product.unit_cost * booking.number_of_people
        if payment.deposit_paid >= total_amount:
            payment.payment_status = PaymentStatus.FULLY_PAID
        elif payment.deposit_paid > 0:
            payment.payment_status = PaymentStatus.DEPOSIT_PAID
        else:
            payment.payment_status = PaymentStatus.PENDING
        
        db.commit()
        
        # Create notification for admin
        create_notification(
            db=db,
            user_id=booking.user_id,
            type="payment_validation",
            message=f"Your payment for booking {booking.booking_name} has been validated. Status: {payment_data.validation_status}",
            data={"booking_id": booking.id, "validation_status": payment_data.validation_status}
        )
        
        # Return the exact validation status that was set
        return {
            "validation_status": payment_data.validation_status,
            "payment_status": payment.payment_status.value,
            "amount_received": float(payment.deposit_paid),
            "total_amount": float(total_amount)
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
    
    bookings = (
        db.query(Booking)
        .join(Payment)
        .filter(Payment.payment_status == PaymentStatus.PENDING)
        .all()
    )
    
    return [{
        "booking_id": booking.id,
        "booking_name": booking.booking_name,
        "product": booking.product.name,
        "date": booking.date,
        "number_of_people": booking.number_of_people,
        "payment_status": booking.payment.payment_status.value,
        "deposit_amount": float(booking.payment.deposit_amount),
        "balance_due": float(booking.payment.balance_due),
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
            (Payment.payment_status == PaymentStatus.DEPOSIT_PAID) &
            (Payment.balance_due_date < now) |
            (Payment.payment_status == PaymentStatus.PENDING) &
            (Payment.deposit_due_date < now)
        )
        .all()
    )
    
    return [{
        "booking_id": booking.id,
        "booking_name": booking.booking_name,
        "product": booking.product.name,
        "payment_status": booking.payment.payment_status.value,
        "amount_due": float(booking.payment.balance_due),
        "due_date": booking.payment.balance_due_date
    } for booking in overdue_bookings] 