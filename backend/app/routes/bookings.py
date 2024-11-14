from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.site import Site, Product
from ..models.payment import Payment, PaymentStatus, ValidationStatus
from ..utils.auth import get_current_user
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from .notifications import create_notification, notify_admins

router = APIRouter()

class BookingCreate(BaseModel):
    date: date
    site: str
    product: str
    booking_name: str
    number_of_people: int
    status: str  # 'provisional' or 'confirmed'
    available_slots: int

# Update this helper function to use UserRole enum
async def verify_booking_access(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.SUPERUSER:  # Use enum instead of string
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IT Managers do not have access to booking operations"
        )
    return current_user

@router.post("")
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(verify_booking_access),
    db: Session = Depends(get_db)
):
    # Check if user has correct role
    if current_user.role not in [UserRole.ADMIN, UserRole.USER]:  # Use enum values
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and users can create bookings"
        )

    # Validate status
    if booking_data.status not in ['provisional', 'confirmed']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'provisional' or 'confirmed'"
        )

    # Get site
    site = db.query(Site).filter(Site.name == booking_data.site).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )

    # Get product
    product = db.query(Product).filter(
        Product.site_id == site.id,
        Product.name == booking_data.product
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Create booking without checking for existing bookings
    booking = Booking(
        date=booking_data.date,
        booking_name=booking_data.booking_name,
        number_of_people=booking_data.number_of_people,
        status=booking_data.status,
        user_id=current_user.id,
        site_id=site.id,
        product_id=product.id,
        available_slots=booking_data.available_slots
    )

    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Format response to match Summary table exactly
        return {
            "booking_name": booking.booking_name,
            "number_of_people": booking.number_of_people,
            "date": booking.date,
            "product": product.name,
            "available_slots": booking.available_slots,
            "status": "Provisional",
            "created_at": booking.created_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating booking: {str(e)}"
        )

@router.get("")
async def get_bookings(
    current_user: User = Depends(verify_booking_access),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Booking)
        .join(Site)
        .join(Product)
        .join(Payment, isouter=True)
    )
    
    if current_user.role == UserRole.USER:
        query = query.filter(Booking.user_id == current_user.id)
    
    bookings = query.all()
    
    return [{
        "id": booking.id,
        "date": booking.date,
        "booking_name": booking.booking_name,
        "number_of_people": booking.number_of_people,
        "status": booking.status.value,
        "site": booking.site.name if booking.site else None,
        "product": booking.product.name if booking.product else None,
        "available_slots": booking.available_slots,
        "unit_cost": float(booking.product.unit_cost),
        "total_amount": float(booking.product.unit_cost * booking.number_of_people),
        "amount_received": float(booking.payment.deposit_paid) if booking.payment else 0,
        "balance": float((booking.product.unit_cost * booking.number_of_people) - 
                        (booking.payment.deposit_paid if booking.payment else 0)),
        "payment_status": booking.payment.payment_status.value if booking.payment else None,
        "validation_status": booking.payment.validation_status.value if booking.payment else None
    } for booking in bookings]

@router.get("/my-bookings")
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Fix the join condition
        bookings = (
            db.query(Booking)
            .join(Site, Site.id == Booking.site_id)
            .join(Product, Product.id == Booking.product_id)  # Fix join condition
            .filter(Booking.user_id == current_user.id)
            .order_by(Booking.date.desc())
            .all()
        )
        
        return [{
            "id": booking.id,
            "booking_name": booking.booking_name,
            "number_of_people": booking.number_of_people,
            "date": booking.date,
            "site": booking.site.name if booking.site else None,
            "product": booking.product.name if booking.product else None,
            "available_slots": booking.available_slots,
            "status": booking.status,
            "created_at": booking.created_at
        } for booking in bookings]
    except Exception as e:
        print(f"Error in get_my_bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/recent-bookings")
async def get_recent_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thirty_days_ago = datetime.now() - timedelta(days=30)
    query = (
        db.query(Booking)
        .join(Site)
        .join(Product)
        .filter(Booking.created_at >= thirty_days_ago)
    )
    
    if current_user.role != UserRole.ADMIN:
        query = query.filter(Booking.user_id == current_user.id)
        
    bookings = query.order_by(Booking.date.desc()).all()
    
    return [{
        "id": booking.id,
        "date": booking.date,
        "booking_name": booking.booking_name,
        "number_of_people": booking.number_of_people,
        "status": booking.status,
        "site": booking.site.name if booking.site else None,
        "product": booking.product.name if booking.product else None,
        "available_slots": booking.available_slots,
        "created_at": booking.created_at
    } for booking in bookings]

@router.delete("/{booking_id}")
async def delete_booking(
    booking_id: int,
    current_user: User = Depends(verify_booking_access),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only allow users to delete their own bookings or admin to delete any
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this booking")
    
    db.delete(booking)
    db.commit()
    return {"message": "Booking deleted successfully"}

@router.put("/{booking_id}")
async def update_booking(
    booking_id: int,
    booking_data: BookingCreate,
    current_user: User = Depends(verify_booking_access),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only allow users to modify their own bookings or admin to modify any
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this booking")
    
    # Update booking fields
    for field, value in booking_data.dict().items():
        setattr(booking, field, value)
    
    db.commit()
    db.refresh(booking)
    return booking

@router.post("/{booking_id}/request-confirmation")
async def request_confirmation(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify ownership or admin status
    if current_user.role != UserRole.ADMIN and booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this booking"
        )
    
    # Can only request confirmation for provisional bookings
    if booking.status != BookingStatus.PROVISIONAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only request confirmation for provisional bookings"
        )
    
    booking.status = BookingStatus.REQUESTED
    
    # Create notification for admins
    notify_admins(
        db=db,
        type="confirmation_request",
        message=f"New confirmation request from {current_user.username}",
        data={
            "user_name": current_user.username,
            "booking_name": booking.booking_name,
            "number_of_people": booking.number_of_people,
            "product": booking.product.name,
            "date": booking.date.isoformat()
        }
    )
    
    try:
        db.commit()
        return {"message": "Confirmation requested successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/{booking_id}/send-to-finance")
async def send_to_finance(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send bookings to finance"
        )
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Can only send to finance if status is REQUESTED
    if booking.status != BookingStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send requested bookings to finance"
        )
    
    # Create initial payment record if it doesn't exist
    if not booking.payment:
        payment = Payment(
            booking_id=booking.id,
            payment_status=PaymentStatus.PENDING,
            validation_status=ValidationStatus.PENDING,
            deposit_due_date=datetime.utcnow() + timedelta(days=7),  # Give 7 days for deposit
            balance_due_date=datetime.utcnow() + timedelta(days=30)  # Give 30 days for full payment
        )
        db.add(payment)
    
    booking.status = BookingStatus.VR  # validation_request
    
    # Create notification for finance admins
    finance_admins = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
    for admin in finance_admins:
        create_notification(
            db=db,
            user_id=admin.id,
            type="validation_request",
            message=f"New validation request for booking {booking.booking_name}",
            data={
                "booking_name": booking.booking_name,
                "number_of_people": booking.number_of_people,
                "product": booking.product.name
            }
        )
    
    try:
        db.commit()
        return {"message": "Booking sent to finance successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/request-count")
async def get_request_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view request count"
        )
    
    count = db.query(Booking).filter(
        Booking.status == BookingStatus.REQUESTED
    ).count()
    
    return {"count": count}