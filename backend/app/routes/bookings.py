from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.site import Site, Product
from ..models.payment import Payment, PaymentStatus, ValidationStatus
from ..models.available_slots import AvailableSlot
from ..models.golden_monkey_slots import GoldenMonkeySlot
from ..utils.auth import get_current_user
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from .notifications import create_simple_notification
from ..models.authorization import AuthorizationRequest
from ..models.passport_data import PassportData


def _lookup_slots(db: Session, booking_date, product_name: str) -> str | None:
    """Return current available slots string for a booking's date and product."""
    if not booking_date:
        return None
    date_str = booking_date.strftime("%d/%m/%Y")
    if product_name and "Golden Monkeys" in product_name:
        row = db.query(GoldenMonkeySlot).filter(GoldenMonkeySlot.date == date_str).first()
    else:
        row = db.query(AvailableSlot).filter(AvailableSlot.date == date_str).first()
    return row.slots if row else None

router = APIRouter()

class BookingCreate(BaseModel):
    date: date
    site: str
    product: str
    booking_name: str
    number_of_people: int
    status: str  # 'provisional' or 'confirmed'
    available_slots: int
    agent_client_id: int | None = None

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
    # First, find the site and product
    site = db.query(Site).join(Product).filter(
        Product.name == booking_data.product
    ).first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found for the given product"
        )

    # Find the specific product
    product = db.query(Product).filter(
        Product.name == booking_data.product,
        Product.site_id == site.id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Convert status string to BookingStatus enum
    try:
        booking_status_value = BookingStatus(booking_data.status)
    except ValueError:
        booking_status_value = BookingStatus.PROVISIONAL

    # Create the booking
    booking = Booking(
        date=booking_data.date,
        booking_name=booking_data.booking_name,
        people=booking_data.number_of_people,
        number_of_permits=booking_data.number_of_people,
        booking_status=booking_status_value,
        user_id=current_user.id,
        site_id=site.id,
        product_id=product.id,
        product=booking_data.product,
        agent_client_id=booking_data.agent_client_id,
    )

    db.add(booking)
    try:
        db.commit()
        db.refresh(booking)

        # Notify admins immediately when a booking is created as 'requested'
        if booking_status_value == BookingStatus.REQUESTED:
            admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
            for admin in admins:
                create_simple_notification(
                    db, admin.id, "Confirmation Request",
                    f"New confirmation request from {current_user.username} for {booking.booking_name}"
                )
            db.commit()
            db.refresh(booking)

        return {
            "id": booking.id,
            "booking_name": booking.booking_name,
            "date": str(booking.date),
            "site": booking_data.site,
            "product": booking.product,
            "number_of_people": booking.people,
            "status": booking.booking_status.value if booking.booking_status else None,
            "payment_status": "pending",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{booking_id}/client-details")
async def get_client_details(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..models.passport_data import PassportData

    booking = (
        db.query(Booking)
        .join(Site, isouter=True)
        .join(Product, isouter=True)
        .join(Payment, isouter=True)
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    elevated_roles = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN, UserRole.AUTHORIZER]
    if current_user.role not in elevated_roles and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    passports = db.query(PassportData).filter(PassportData.booking_id == booking_id).all()

    return {
        "id": booking.id,
        "booking_name": booking.booking_name,
        "booking_ref": booking.booking_ref,
        "product": booking.product_rel.name if booking.product_rel else booking.product,
        "site": booking.site.name if booking.site else None,
        "date": booking.date,
        "date_of_request": booking.date_of_request,
        "number_of_people": booking.people,
        "agent_client": booking.agent_client,
        "head_of_file": booking.head_of_file,
        "status": booking.booking_status.value if booking.booking_status else None,
        "total_amount": float(booking.product_rel.unit_cost * booking.people)
                        if booking.product_rel and booking.people else 0,
        "payment_status": booking.payment.payment_status.value if booking.payment and booking.payment.payment_status else None,
        "validation_status": booking.payment.validation_status.value
                             if booking.payment and booking.payment.validation_status else None,
        "validation_notes": booking.payment.validation_notes if booking.payment else None,
        "amount_received": float(booking.payment.deposit_paid) if booking.payment else 0,
        "passports": [{
            "full_name": p.full_name,
            "date_of_birth": str(p.date_of_birth),
            "passport_number": p.passport_number,
            "passport_expiry": str(p.passport_expiry),
            "nationality": p.nationality,
            "gender": p.gender,
        } for p in passports]
    }


@router.get("/{booking_id}/timeline")
async def get_booking_timeline(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..models.amendment import AmendmentRequest
    from ..models.cancellation import CancellationRequest
    from ..models.chase import ChaseRecord

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    elevated_roles = [UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN, UserRole.AUTHORIZER]
    if current_user.role not in elevated_roles and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    events = []

    # 1. Booking created
    events.append({
        "timestamp": booking.created_at.isoformat() if booking.created_at else None,
        "type": "created",
        "title": "Booking Created",
        "detail": f"Initial status: {booking.booking_status.value.replace('_', ' ').title() if booking.booking_status else 'Unknown'}",
        "color": "gray",
        "is_current": False,
    })

    # 2. Authorization requests
    auth_requests = (
        db.query(AuthorizationRequest)
        .filter(AuthorizationRequest.booking_id == booking_id)
        .order_by(AuthorizationRequest.created_at)
        .all()
    )
    for auth in auth_requests:
        requester_name = auth.requester.username if auth.requester else "Unknown"
        reason_short = (auth.reason[:80] + "…") if auth.reason and len(auth.reason) > 80 else (auth.reason or "—")
        events.append({
            "timestamp": auth.created_at.isoformat() if auth.created_at else None,
            "type": "auth_requested",
            "title": "Authorization Requested",
            "detail": f"By {requester_name}: {reason_short}",
            "color": "orange",
            "is_current": False,
        })
        if auth.status == "authorized":
            authorizer_name = auth.authorizer_user.username if auth.authorizer_user else "Authorizer"
            notes = f": {auth.authorizer_notes}" if auth.authorizer_notes else ""
            events.append({
                "timestamp": auth.created_at.isoformat(),
                "type": "auth_approved",
                "title": "Authorization Approved",
                "detail": f"By {authorizer_name}{notes}",
                "color": "green",
                "is_current": False,
            })
        elif auth.status == "declined":
            authorizer_name = auth.authorizer_user.username if auth.authorizer_user else "Authorizer"
            notes = f": {auth.authorizer_notes}" if auth.authorizer_notes else ""
            events.append({
                "timestamp": auth.created_at.isoformat(),
                "type": "auth_declined",
                "title": "Authorization Declined",
                "detail": f"By {authorizer_name}{notes}",
                "color": "red",
                "is_current": False,
            })
        if auth.appeal:
            appeal_text = (auth.appeal.appeal_notes[:80] + "…") if auth.appeal.appeal_notes and len(auth.appeal.appeal_notes) > 80 else (auth.appeal.appeal_notes or "—")
            events.append({
                "timestamp": auth.appeal.created_at.isoformat() if auth.appeal.created_at else None,
                "type": "appeal",
                "title": "Appeal Filed",
                "detail": appeal_text,
                "color": "purple",
                "is_current": False,
            })

    # 3. Payment events
    if booking.payment:
        p = booking.payment
        pay_status = p.payment_status.value.replace("_", " ").title() if p.payment_status else "—"
        events.append({
            "timestamp": p.created_at.isoformat() if p.created_at else None,
            "type": "payment_recorded",
            "title": "Payment Recorded",
            "detail": f"Status: {pay_status}",
            "color": "blue",
            "is_current": False,
        })
        if p.validated_at:
            val = p.validation_status.value.replace("_", " ").title() if p.validation_status else "Unknown"
            notes = f" — {p.validation_notes}" if p.validation_notes else ""
            events.append({
                "timestamp": p.validated_at.isoformat(),
                "type": "payment_validated",
                "title": "Payment Validated",
                "detail": f"Validation: {val}{notes}",
                "color": "green",
                "is_current": False,
            })

    # 4. Amendment requests
    amendments = (
        db.query(AmendmentRequest)
        .filter(AmendmentRequest.booking_id == booking_id)
        .order_by(AmendmentRequest.created_at)
        .all()
    )
    for amend in amendments:
        reason_short = f" ({amend.reason})" if amend.reason else ""
        events.append({
            "timestamp": amend.created_at.isoformat() if amend.created_at else None,
            "type": "amendment",
            "title": "Amendment Requested",
            "detail": f"{amend.original_date} → {amend.requested_date}{reason_short}",
            "color": "orange",
            "is_current": False,
        })

    # 5. Cancellation requests
    cancellations = (
        db.query(CancellationRequest)
        .filter(CancellationRequest.booking_id == booking_id)
        .order_by(CancellationRequest.created_at)
        .all()
    )
    for cancel in cancellations:
        events.append({
            "timestamp": cancel.created_at.isoformat() if cancel.created_at else None,
            "type": "cancellation",
            "title": "Cancellation Requested",
            "detail": cancel.reason or "—",
            "color": "red",
            "is_current": False,
        })

    # 6. Chase record
    chase = db.query(ChaseRecord).filter(ChaseRecord.booking_id == booking_id).first()
    if chase:
        chase_status = f" — {chase.status.value}" if chase.status else ""
        events.append({
            "timestamp": chase.created_at.isoformat() if chase.created_at else None,
            "type": "chase",
            "title": "Chase Initiated",
            "detail": f"{chase.chase_count}/5 chase attempts{chase_status}",
            "color": "red",
            "is_current": False,
        })

    # Sort by timestamp ascending, None timestamps go last
    events.sort(key=lambda e: e["timestamp"] or "9999-99-99")

    # Mark the last event as current
    if events:
        events[-1]["is_current"] = True

    return {
        "booking": {
            "id": booking.id,
            "booking_name": booking.booking_name,
            "booking_ref": booking.booking_ref,
            "product": booking.product_rel.name if booking.product_rel else booking.product,
            "date": booking.date.isoformat() if booking.date else None,
            "people": booking.people,
            "status": booking.booking_status.value if booking.booking_status else None,
            "payment_status": booking.payment.payment_status.value if booking.payment and booking.payment.payment_status else None,
            "validation_status": booking.payment.validation_status.value if booking.payment and booking.payment.validation_status else None,
        },
        "events": events,
    }


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
    elif current_user.role == UserRole.FINANCE_ADMIN:
        query = query.filter(Booking.booking_status != BookingStatus.PROVISIONAL)

    bookings = query.all()

    # Pre-fetch authorization and passport data for all bookings in one query
    booking_ids = [b.id for b in bookings]
    auth_requests = (
        db.query(AuthorizationRequest)
        .filter(AuthorizationRequest.booking_id.in_(booking_ids))
        .order_by(AuthorizationRequest.created_at.desc())
        .all()
    ) if booking_ids else []
    # Latest auth request per booking (status + id + appeal status)
    auth_map = {}        # booking_id → status
    auth_id_map = {}     # booking_id → request id
    appeal_map = {}      # booking_id → appeal status (if any)
    for ar in auth_requests:
        if ar.booking_id not in auth_map:
            auth_map[ar.booking_id] = ar.status
            auth_id_map[ar.booking_id] = ar.id
            if ar.appeal:
                appeal_map[ar.booking_id] = ar.appeal.status

    # Passport counts per booking
    passport_rows = (
        db.query(PassportData.booking_id)
        .filter(PassportData.booking_id.in_(booking_ids))
        .all()
    ) if booking_ids else []
    passport_counts = {}
    for (bid,) in passport_rows:
        passport_counts[bid] = passport_counts.get(bid, 0) + 1

    today = date.today()

    product_name = lambda b: b.product_rel.name if b.product_rel else b.product
    return [{
        "id": booking.id,
        "date": booking.date,
        "booking_name": booking.booking_name,
        "number_of_people": booking.people,
        "status": booking.booking_status.value if booking.booking_status else None,
        "site": booking.site.name if booking.site else None,
        "product": product_name(booking),
        "unit_cost": float(booking.product_rel.unit_cost) if booking.product_rel else 0,
        "total_amount": float(booking.product_rel.unit_cost * booking.people) if booking.product_rel and booking.people else 0,
        "amount_received": float(booking.payment.deposit_paid) if booking.payment else 0,
        "balance": float((booking.product_rel.unit_cost * booking.people) -
                        (booking.payment.deposit_paid if booking.payment else 0)) if booking.product_rel and booking.people else 0,
        "payment_status": booking.payment.payment_status.value if booking.payment and booking.payment.payment_status else None,
        "validation_status": booking.payment.validation_status.value if booking.payment and booking.payment.validation_status else None,
        "action_status": booking.payment.validation_status.value.replace('_', ' ').title() if booking.payment and booking.payment.validation_status else "Pending",
        "deposit_due_date": booking.payment.deposit_due_date.isoformat() if booking.payment and booking.payment.deposit_due_date else None,
        "balance_due_date": booking.payment.balance_due_date.isoformat() if booking.payment and booking.payment.balance_due_date else None,
        "agent_client": booking.agent_client,
        "head_of_file": booking.head_of_file,
        "date_of_request": booking.date_of_request,
        "available_slots": _lookup_slots(db, booking.date, product_name(booking)),
        "authorization_status": auth_map.get(booking.id),
        "authorization_request_id": auth_id_map.get(booking.id),
        "appeal_status": appeal_map.get(booking.id),
        "agent_client_id": booking.agent_client_id,
        "agent_client_name": booking.agent_client_rel.name if booking.agent_client_rel else booking.agent_client,
        "agent_client_trusted": booking.agent_client_rel.is_trusted if booking.agent_client_rel else None,
        "passport_count": passport_counts.get(booking.id, 0),
        "days_to_trek": (booking.date - today).days if booking.date else None,
    } for booking in bookings]

@router.get("/my-bookings")
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        bookings = (
            db.query(Booking)
            .join(Site, Site.id == Booking.site_id)
            .join(Product, Product.id == Booking.product_id)
            .filter(Booking.user_id == current_user.id)
            .order_by(Booking.date.desc())
            .all()
        )

        product_name = lambda b: b.product_rel.name if b.product_rel else b.product
        return [{
            "id": booking.id,
            "booking_name": booking.booking_name,
            "number_of_people": booking.people,
            "date": booking.date,
            "site": booking.site.name if booking.site else None,
            "product": product_name(booking),
            "status": booking.booking_status.value if booking.booking_status else None,
            "created_at": booking.created_at,
            "available_slots": _lookup_slots(db, booking.date, product_name(booking))
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
        "number_of_people": booking.people,
        "status": booking.booking_status.value if booking.booking_status else None,
        "site": booking.site.name if booking.site else None,
        "product": booking.product_rel.name if booking.product_rel else booking.product,
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
    if current_user.role != UserRole.ADMIN and booking.user_id != current_user.id:
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
    if current_user.role != UserRole.ADMIN and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this booking")

    booking.booking_name = booking_data.booking_name
    booking.people = booking_data.number_of_people
    booking.number_of_permits = booking_data.number_of_people
    booking.date = booking_data.date
    if booking_data.status:
        try:
            booking.booking_status = BookingStatus(booking_data.status)
        except ValueError:
            pass

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
    if booking.booking_status != BookingStatus.PROVISIONAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only request confirmation for provisional bookings"
        )

    booking.booking_status = BookingStatus.REQUESTED

    # Create notification for admins
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        create_simple_notification(
            db, admin.id, "Confirmation Request",
            f"New confirmation request from {current_user.username} for {booking.booking_name}"
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
    if booking.booking_status != BookingStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send requested bookings to finance"
        )

    _create_payment_for_booking(booking, db)
    booking.booking_status = BookingStatus.VR  # validation_request

    # Create notification for finance admins
    finance_admins = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
    for admin in finance_admins:
        create_simple_notification(
            db, admin.id, "Validation Request",
            f"New validation request for booking {booking.booking_name}"
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

def _create_payment_for_booking(booking: Booking, db: Session, confirmed_by_id: int | None = None):
    """
    Create a Payment record for a booking using the agent's payment terms.
    If the agent has a rolling deposit, auto-apply it (deposit or full based on 45-day rule).
    """
    from ..services.rolling_deposit import calculate_due_dates, apply_rolling_deposit
    from ..models.agent_client import AgentClient, PaymentTermsAnchor

    if booking.payment:
        return

    unit_cost = float(booking.product_rel.unit_cost) if booking.product_rel else 0
    units     = booking.people or 0
    total     = unit_cost * units
    deposit_amount = round(total * 0.3, 2)

    ac = booking.agent_client_rel

    if ac:
        deposit_due, balance_due_dt, require_full = calculate_due_dates(booking, ac)
    else:
        deposit_due   = datetime.utcnow() + timedelta(days=14)
        balance_due_dt = (
            datetime.combine(booking.date, datetime.min.time()) - timedelta(days=45)
            if booking.date else datetime.utcnow() + timedelta(days=30)
        )
        require_full = False

    payment = Payment(
        booking_id=booking.id,
        payment_status=PaymentStatus.PENDING,
        validation_status=ValidationStatus.PENDING,
        unit_cost=unit_cost,
        units=units,
        amount=total,
        deposit_amount=deposit_amount,
        deposit_paid=0,
        balance_due=total,
        deposit_due_date=deposit_due,
        balance_due_date=balance_due_dt,
    )
    db.add(payment)
    db.flush()  # give payment an id

    # Auto-apply rolling deposit if available
    if ac and ac.has_rolling_deposit and ac.rolling_deposit_balance > 0:
        applied = apply_rolling_deposit(db, booking, ac, payment, confirmed_by_id)
        if not applied:
            # Insufficient balance — notify finance
            create_simple_notification(
                db,
                confirmed_by_id or booking.user_id,
                "Rolling Deposit Insufficient",
                f"Booking '{booking.booking_name}' for {ac.name}: rolling deposit balance "
                f"${ac.rolling_deposit_balance:.2f} is below required "
                f"{'full' if require_full else 'deposit'} amount ${total if require_full else deposit_amount:.2f}. "
                f"Manual action required."
            )


@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can confirm bookings")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.booking_status != BookingStatus.REQUESTED:
        raise HTTPException(status_code=400, detail="Only requested bookings can be confirmed")

    booking.booking_status = BookingStatus.CONFIRMED
    _create_payment_for_booking(booking, db, confirmed_by_id=current_user.id)
    create_simple_notification(db, booking.user_id, "Booking Confirmed",
        f"Your booking '{booking.booking_name}' has been confirmed.")
    db.commit()
    return {"message": "Booking confirmed successfully"}


@router.post("/{booking_id}/reject")
async def reject_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can reject bookings")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.booking_status not in [BookingStatus.REQUESTED, BookingStatus.PROVISIONAL]:
        raise HTTPException(status_code=400, detail="Only provisional/requested bookings can be rejected")

    booking.booking_status = BookingStatus.REJECTED
    create_simple_notification(db, booking.user_id, "Booking Rejected",
        f"Your booking '{booking.booking_name}' has been rejected.")
    db.commit()
    return {"message": "Booking rejected successfully"}


class PurchasePermitsBody(BaseModel):
    purchase_type: str  # "full" | "deposit" | "authorization"


@router.post("/{booking_id}/purchase-permits")
async def purchase_permits(
    booking_id: int,
    body: PurchasePermitsBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can purchase permits")

    if body.purchase_type not in ["full", "deposit", "authorization"]:
        raise HTTPException(status_code=400, detail="purchase_type must be full, deposit, or authorization")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    purchasable = [BookingStatus.CONFIRMED, BookingStatus.AWAITING_AUTHORIZATION, BookingStatus.AUTHORIZED]
    if booking.booking_status not in purchasable:
        raise HTTPException(status_code=400, detail="Booking must be confirmed or authorized to purchase permits")

    status_map = {
        "full": BookingStatus.SECURED_FULL,
        "deposit": BookingStatus.SECURED_DEPOSIT,
        "authorization": BookingStatus.SECURED_AUTHORIZATION,
    }
    booking.booking_status = status_map[body.purchase_type]

    from ..services.email_service import email_permits_purchased
    label_map = {"full": "in full", "deposit": "on deposit", "authorization": "under authorization"}
    trek_date_str = booking.date.strftime("%Y-%m-%d") if booking.date else "TBD"
    create_simple_notification(
        db, booking.user_id, "Permits Secured",
        f"Permits for your booking '{booking.booking_name}' have been purchased {label_map[body.purchase_type]}."
    )
    if body.purchase_type == "deposit":
        create_simple_notification(
            db, booking.user_id, "Balance Top-up Required",
            f"Your booking '{booking.booking_name}' is secured on deposit. The balance must be paid 45 days before your trek date."
        )
    if booking.user and booking.user.email:
        email_permits_purchased(
            booking.user.email, booking.booking_name,
            label_map[body.purchase_type], trek_date_str
        )

    db.commit()
    return {"message": f"Permits purchased {label_map[body.purchase_type]}", "booking_status": booking.booking_status.value}


class RequestDetailsBody(BaseModel):
    message: str

@router.post("/{booking_id}/request-details")
async def request_details(
    booking_id: int,
    body: RequestDetailsBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Only admins can request details")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Notify the booking owner
    create_simple_notification(
        db, booking.user_id,
        "Details Requested",
        f"Admin has requested more details for booking '{booking.booking_name}': {body.message}",
    )
    # Also notify finance if booking is in VR/confirmed state
    if booking.booking_status in [BookingStatus.VR, BookingStatus.CONFIRMED]:
        finance_users = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
        for fu in finance_users:
            create_simple_notification(
                db, fu.id,
                "Details Requested",
                f"Admin requested more details for booking '{booking.booking_name}': {body.message}",
            )

    db.commit()
    return {"message": "Details requested, notifications sent"}


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
        Booking.booking_status == BookingStatus.REQUESTED
    ).count()

    return {"count": count}


@router.get("/all")
async def get_all_bookings(
    current_user: User = Depends(verify_booking_access),
    db: Session = Depends(get_db)
):
    return await get_bookings(current_user=current_user, db=db)


@router.post("/{booking_id}/payment-request")
async def request_payment(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can send payment requests"
        )

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    create_simple_notification(
        db, booking.user_id, "Payment Request",
        f"Please submit payment for booking {booking.booking_name}"
    )

    try:
        db.commit()
        return {"message": "Payment request sent successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
