"""
Accounts Receivable / Payable + Rolling Deposit management routes.
All endpoints require FINANCE_ADMIN, ADMIN, or SUPERUSER.
"""
from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.payment import Payment, PaymentStatus, ValidationStatus
from ..models.agent_client import (
    AgentClient, RollingDepositTransaction, RollingDepositTransactionType,
    PaymentTermsAnchor,
)
from ..models.available_slots import AvailableSlot
from ..models.golden_monkey_slots import GoldenMonkeySlot
from ..utils.auth import get_current_user
from ..services.rolling_deposit import (
    return_rolling_deposit, top_up_rolling_deposit,
    adjust_rolling_deposit, update_due_date,
)

router = APIRouter()

_FINANCE_ROLES = {UserRole.FINANCE_ADMIN, UserRole.ADMIN, UserRole.SUPERUSER}

_OUTSTANDING_STATUSES = [
    # Standard flow — payment pending
    BookingStatus.CONFIRMED,
    BookingStatus.VR,
    BookingStatus.AWAITING_AUTHORIZATION,
    BookingStatus.AUTHORIZED,
    BookingStatus.CHASE,
    # Permit purchased — balance may still be owed
    BookingStatus.SECURED_DEPOSIT,
    BookingStatus.SECURED_FULL,
    BookingStatus.SECURED_AUTHORIZATION,
    # Mid-workflow — payment still outstanding
    BookingStatus.AMENDMENT_REQUESTED,
    BookingStatus.CANCELLATION_REQUESTED,
]

_SECURED_STATUSES = [
    BookingStatus.SECURED_DEPOSIT,
    BookingStatus.SECURED_FULL,
    BookingStatus.SECURED_AUTHORIZATION,
]


def _require_finance(current_user: User):
    if current_user.role not in _FINANCE_ROLES:
        raise HTTPException(status_code=403, detail="Finance access required")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _slot_count(booking: Booking, db: Session):
    if not booking.date:
        return None
    # Slots tables store date as "dd/mm/yyyy" string
    date_str = booking.date.strftime("%d/%m/%Y")
    product_lower = (booking.product or "").lower()
    if "gorilla" in product_lower:
        row = db.query(AvailableSlot).filter(AvailableSlot.date == date_str).first()
        try:
            return int(row.slots) if row and row.slots and row.slots.isdigit() else None
        except (ValueError, AttributeError):
            return None
    if "golden" in product_lower or "monkey" in product_lower:
        row = db.query(GoldenMonkeySlot).filter(GoldenMonkeySlot.date == date_str).first()
        try:
            return int(row.slots) if row and row.slots and row.slots.isdigit() else None
        except (ValueError, AttributeError):
            return None
    return None


def _urgency(slots):
    if slots is None:
        return "normal"
    if slots < 10:
        return "critical"
    if slots < 20:
        return "high"
    return "normal"


def _rd_applied_for_booking(booking_id: int, db: Session) -> bool:
    return db.query(RollingDepositTransaction).filter(
        RollingDepositTransaction.booking_id == booking_id,
        RollingDepositTransaction.type == RollingDepositTransactionType.APPLIED,
    ).first() is not None


def _booking_ar_row(booking: Booking, db: Session) -> dict:
    p = booking.payment
    ac = booking.agent_client_rel
    slots = _slot_count(booking, db)
    now = datetime.utcnow()

    deposit_overdue = p and p.deposit_due_date and p.deposit_due_date < now and p.payment_status == PaymentStatus.PENDING
    balance_overdue = p and p.balance_due_date and p.balance_due_date < now and p.payment_status == PaymentStatus.DEPOSIT_PAID

    amount_owed = 0.0
    if p:
        if p.payment_status == PaymentStatus.PENDING:
            amount_owed = float(p.deposit_amount or 0)
        elif p.payment_status == PaymentStatus.DEPOSIT_PAID:
            amount_owed = float(p.balance_due or 0)

    rd_applied = (
        _rd_applied_for_booking(booking.id, db)
        if (ac and ac.has_rolling_deposit) else False
    )

    # Extra flags for UI context
    is_amendment    = booking.booking_status == BookingStatus.AMENDMENT_REQUESTED
    is_cancellation = booking.booking_status == BookingStatus.CANCELLATION_REQUESTED

    return {
        "booking_id":          booking.id,
        "booking_name":        booking.booking_name,
        "booking_ref":         booking.booking_ref,
        "product":             booking.product,
        "trek_date":           booking.trekking_date or booking.date,
        "people":              booking.people,
        "booking_status":      booking.booking_status.value,
        "agent_client_id":     ac.id if ac else None,
        "agent_client_name":   ac.name if ac else None,
        "is_trusted":          ac.is_trusted if ac else False,
        "has_rolling_deposit": ac.has_rolling_deposit if ac else False,
        "rd_applied":          rd_applied,
        "slots_available":     slots,
        "urgency":             _urgency(slots),
        "payment_id":          p.id if p else None,
        "payment_status":      p.payment_status.value if p else "no_payment",
        "validation_status":   p.validation_status.value if p else None,
        "amount":              float(p.amount or 0) if p else 0,
        "deposit_amount":      float(p.deposit_amount or 0) if p else 0,
        "deposit_paid":        float(p.deposit_paid or 0) if p else 0,
        "balance_due":         float(p.balance_due or 0) if p else 0,
        "amount_owed":         amount_owed,
        "deposit_due_date":    p.deposit_due_date if p else None,
        "balance_due_date":    p.balance_due_date if p else None,
        "deposit_overdue":     bool(deposit_overdue),
        "balance_overdue":     bool(balance_overdue),
        "is_amendment":        is_amendment,
        "is_cancellation":     is_cancellation,
    }


def _booking_ap_row(booking: Booking) -> dict:
    """Row for the AP tab — a permit purchase (money paid OUT to the park)."""
    p = booking.payment
    ac = booking.agent_client_rel
    return {
        "booking_id":        booking.id,
        "booking_name":      booking.booking_name,
        "booking_ref":       booking.booking_ref,
        "product":           booking.product,
        "trek_date":         booking.trekking_date or booking.date,
        "people":            booking.people,
        "booking_status":    booking.booking_status.value,
        "agent_client_name": ac.name if ac else (booking.agent_client or "—"),
        "unit_cost":         float(p.unit_cost or 0) if p else 0,
        "permit_cost":       float(p.amount or 0) if p else 0,
        "payment_status":    p.payment_status.value if p else None,
        "processed_by":      p.validator.username if p and p.validator else None,
        "processed_at":      p.validated_at if p else None,
    }


# ─── AR: Accounts Receivable ──────────────────────────────────────────────────

@router.get("/ar")
async def get_accounts_receivable(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All bookings with outstanding money owed."""
    _require_finance(current_user)

    bookings = (
        db.query(Booking)
        .filter(Booking.booking_status.in_(_OUTSTANDING_STATUSES))
        .order_by(Booking.trekking_date.asc().nullslast())
        .all()
    )

    all_rows = [_booking_ar_row(b, db) for b in bookings]
    # Exclude fully-paid — they live in AP only
    rows = [r for r in all_rows if r["payment_status"] != PaymentStatus.FULLY_PAID.value]

    return {
        "metrics": {
            "total_ar":       round(sum(r["amount_owed"] for r in rows), 2),
            "overdue_ar":     round(sum(r["amount_owed"] for r in rows if r["deposit_overdue"] or r["balance_overdue"]), 2),
            "critical_slots": sum(1 for r in rows if r["urgency"] == "critical"),
            "high_slots":     sum(1 for r in rows if r["urgency"] == "high"),
            "total_bookings": len(rows),
        },
        "bookings": rows,
    }


# ─── AP: Accounts Payable (permits purchased) ─────────────────────────────────

@router.get("/ap")
async def get_accounts_payable(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All secured bookings — permits we have paid to the park."""
    _require_finance(current_user)

    bookings = (
        db.query(Booking)
        .filter(Booking.booking_status.in_(_SECURED_STATUSES))
        .order_by(Booking.trekking_date.asc().nullslast())
        .all()
    )

    rows = [_booking_ap_row(b) for b in bookings]

    return {
        "metrics": {
            "total_ap":      round(sum(r["permit_cost"] for r in rows), 2),
            "total_permits": len(rows),
            "total_people":  sum(r["people"] or 0 for r in rows),
        },
        "bookings": rows,
    }


# ─── AP: Rolling Deposit (what we hold on behalf of agents) ───────────────────

@router.get("/rolling-deposit")
async def get_rolling_deposit_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summary of all agent rolling deposit accounts."""
    _require_finance(current_user)

    agents = db.query(AgentClient).filter(AgentClient.has_rolling_deposit == True).all()

    rows = []
    for ac in agents:
        txns = (
            db.query(RollingDepositTransaction)
            .filter(RollingDepositTransaction.agent_client_id == ac.id)
            .all()
        )
        applied_by_booking  = defaultdict(float)
        returned_by_booking = defaultdict(float)
        for t in txns:
            if t.type == RollingDepositTransactionType.APPLIED:
                applied_by_booking[t.booking_id] += t.amount
            elif t.type == RollingDepositTransactionType.RETURNED:
                returned_by_booking[t.booking_id] += t.amount

        pending_return = round(
            sum(applied_by_booking[bid] - returned_by_booking.get(bid, 0)
                for bid in applied_by_booking), 2
        )

        rows.append({
            "agent_client_id":         ac.id,
            "agent_client_name":       ac.name,
            "rolling_deposit_limit":   ac.rolling_deposit_limit,
            "rolling_deposit_balance": ac.rolling_deposit_balance,
            "pending_return":          max(pending_return, 0),
            "utilisation_pct":         round(
                (1 - ac.rolling_deposit_balance / ac.rolling_deposit_limit) * 100, 1
            ) if ac.rolling_deposit_limit > 0 else 0,
        })

    return {
        "metrics": {
            "total_held":           round(sum(r["rolling_deposit_limit"] for r in rows), 2),
            "total_available":      round(sum(r["rolling_deposit_balance"] for r in rows), 2),
            "total_pending_return": round(sum(r["pending_return"] for r in rows), 2),
        },
        "agents": rows,
    }


@router.get("/rolling-deposit/{agent_id}/ledger")
async def get_agent_ledger(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full transaction ledger for one agent, plus pending returns list."""
    _require_finance(current_user)

    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent not found")

    txns = (
        db.query(RollingDepositTransaction)
        .filter(RollingDepositTransaction.agent_client_id == agent_id)
        .order_by(RollingDepositTransaction.created_at.desc())
        .all()
    )

    # Build pending returns: bookings where applied > returned
    applied_by_booking  = defaultdict(float)
    returned_by_booking = defaultdict(float)
    booking_names       = {}
    for t in txns:
        if t.booking_id:
            booking_names[t.booking_id] = t.booking.booking_name if t.booking else f"#{t.booking_id}"
        if t.type == RollingDepositTransactionType.APPLIED:
            applied_by_booking[t.booking_id] += t.amount
        elif t.type == RollingDepositTransactionType.RETURNED:
            returned_by_booking[t.booking_id] += t.amount

    pending_returns = [
        {
            "booking_id":   bid,
            "booking_name": booking_names.get(bid, f"#{bid}"),
            "applied":      round(applied_by_booking[bid], 2),
            "returned":     round(returned_by_booking.get(bid, 0), 2),
            "outstanding":  round(applied_by_booking[bid] - returned_by_booking.get(bid, 0), 2),
        }
        for bid in applied_by_booking
        if applied_by_booking[bid] - returned_by_booking.get(bid, 0) > 0.01
    ]

    return {
        "agent_client_id":         ac.id,
        "agent_client_name":       ac.name,
        "rolling_deposit_limit":   ac.rolling_deposit_limit,
        "rolling_deposit_balance": ac.rolling_deposit_balance,
        "pending_returns":         pending_returns,
        "transactions": [
            {
                "id":           t.id,
                "type":         t.type.value,
                "amount":       t.amount,
                "balance_after": t.balance_after,
                "booking_id":   t.booking_id,
                "booking_name": t.booking.booking_name if t.booking else None,
                "notes":        t.notes,
                "created_by":   t.creator.username if t.creator else None,
                "created_at":   t.created_at,
            }
            for t in txns
        ],
    }


class TopUpBody(BaseModel):
    amount: float
    notes: Optional[str] = ""


@router.post("/rolling-deposit/{agent_id}/top-up")
async def post_top_up(
    agent_id: int,
    body: TopUpBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_finance(current_user)
    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent not found")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    top_up_rolling_deposit(db, ac, body.amount, current_user.id, body.notes)
    db.commit()
    return {"balance": ac.rolling_deposit_balance}


class AdjustBody(BaseModel):
    amount: float
    notes: str


@router.post("/rolling-deposit/{agent_id}/adjust")
async def post_adjust(
    agent_id: int,
    body: AdjustBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_finance(current_user)
    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent not found")
    adjust_rolling_deposit(db, ac, body.amount, current_user.id, body.notes)
    db.commit()
    return {"balance": ac.rolling_deposit_balance}


class ReturnBody(BaseModel):
    booking_id: int
    amount: float
    notes: Optional[str] = ""


@router.post("/rolling-deposit/{agent_id}/return")
async def post_return(
    agent_id: int,
    body: ReturnBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark that agent has paid → restore rolling deposit funds."""
    _require_finance(current_user)
    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent not found")
    booking = db.query(Booking).filter(Booking.id == body.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return_rolling_deposit(db, booking, ac, body.amount, current_user.id, body.notes)
    db.commit()
    return {"balance": ac.rolling_deposit_balance}


# ─── Record payment received from agent ───────────────────────────────────────

class RecordPaymentBody(BaseModel):
    payment_type: str           # "deposit" or "full"
    amount: float
    notes: Optional[str] = ""
    return_rd: bool = False     # Also restore agent's rolling deposit pot


@router.post("/payment/{payment_id}/record-payment")
async def record_payment_received(
    payment_id: int,
    body: RecordPaymentBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record cash/wire received from agent. Updates payment status and optionally restores RD."""
    _require_finance(current_user)

    if body.payment_type not in ("deposit", "full"):
        raise HTTPException(status_code=400, detail="payment_type must be 'deposit' or 'full'")

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    booking = payment.booking
    ac = booking.agent_client_rel if booking else None

    if body.payment_type == "deposit":
        payment.deposit_paid = float(payment.deposit_paid or 0) + body.amount
        payment.payment_status = PaymentStatus.DEPOSIT_PAID
    else:
        payment.deposit_paid = float(payment.deposit_paid or 0) + body.amount
        payment.balance_due = 0
        payment.payment_status = PaymentStatus.FULLY_PAID

    if body.return_rd and ac and ac.has_rolling_deposit:
        return_rolling_deposit(db, booking, ac, body.amount, current_user.id,
                               f"Agent payment received — {body.notes or 'via finance AR'}")

    db.commit()
    return {"payment_status": payment.payment_status.value}


# ─── Finance admin: edit payment due dates ────────────────────────────────────

class DueDateUpdate(BaseModel):
    field: str
    new_date: datetime
    reason: Optional[str] = ""


@router.put("/payment/{payment_id}/due-date")
async def update_payment_due_date(
    payment_id: int,
    body: DueDateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_finance(current_user)

    if body.field not in ("deposit_due_date", "balance_due_date"):
        raise HTTPException(status_code=400, detail="field must be deposit_due_date or balance_due_date")

    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    update_due_date(db, payment, body.field, body.new_date, current_user.id, body.reason)
    db.commit()
    return {
        "deposit_due_date": payment.deposit_due_date,
        "balance_due_date": payment.balance_due_date,
    }


@router.get("/payment/{payment_id}/audit")
async def get_due_date_audit(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_finance(current_user)
    from ..models.agent_client import PaymentDueAudit
    audits = (
        db.query(PaymentDueAudit)
        .filter(PaymentDueAudit.payment_id == payment_id)
        .order_by(PaymentDueAudit.changed_at.desc())
        .all()
    )
    return [
        {
            "field":      a.field_changed,
            "old":        a.old_value,
            "new":        a.new_value,
            "reason":     a.reason,
            "changed_by": a.changed_by_user.username if a.changed_by_user else None,
            "changed_at": a.changed_at,
        }
        for a in audits
    ]


# ─── AR metrics for finance dashboard ────────────────────────────────────────

@router.get("/metrics")
async def get_finance_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_finance(current_user)

    now = datetime.utcnow()

    ar_bookings = db.query(Booking).filter(Booking.booking_status.in_(_OUTSTANDING_STATUSES)).all()
    ar_rows = [r for r in [_booking_ar_row(b, db) for b in ar_bookings]
               if r["payment_status"] != PaymentStatus.FULLY_PAID.value]

    ap_bookings = db.query(Booking).filter(Booking.booking_status.in_(_SECURED_STATUSES)).all()
    total_ap = sum(float(b.payment.amount or 0) for b in ap_bookings if b.payment)

    agents_with_rd = db.query(AgentClient).filter(AgentClient.has_rolling_deposit == True).all()

    return {
        "total_ar":                          round(sum(r["amount_owed"] for r in ar_rows), 2),
        "overdue_ar":                        round(sum(r["amount_owed"] for r in ar_rows if r["deposit_overdue"] or r["balance_overdue"]), 2),
        "critical_bookings":                 sum(1 for r in ar_rows if r["urgency"] == "critical"),
        "high_urgency_bookings":             sum(1 for r in ar_rows if r["urgency"] == "high"),
        "total_ap":                          round(total_ap, 2),
        "total_rolling_deposit_held":        round(sum(a.rolling_deposit_limit or 0 for a in agents_with_rd), 2),
        "total_rolling_deposit_available":   round(sum(a.rolling_deposit_balance or 0 for a in agents_with_rd), 2),
    }
