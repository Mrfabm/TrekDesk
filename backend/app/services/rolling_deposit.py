"""
Rolling deposit service — apply, return, top-up, and due-date calculation logic.
"""
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session

from ..models.agent_client import (
    AgentClient, PaymentTermsAnchor,
    RollingDepositTransaction, RollingDepositTransactionType,
)
from ..models.booking import Booking
from ..models.payment import Payment, PaymentStatus
from ..models.agent_client import PaymentDueAudit

FULL_PAYMENT_DAYS_THRESHOLD = 45   # if trek is within this many days, require full payment


def _days_until_trek(booking: Booking) -> int:
    trek = booking.trekking_date or booking.date
    if not trek:
        return 999
    delta = trek - date.today()
    return delta.days


def calculate_due_dates(booking: Booking, ac: AgentClient):
    """
    Return (deposit_due_date, balance_due_date, require_full_payment).

    require_full_payment is True when trek is within FULL_PAYMENT_DAYS_THRESHOLD days
    — in that case deposit_due_date == balance_due_date (one payment, full amount).
    """
    days_left = _days_until_trek(booking)
    require_full = days_left <= FULL_PAYMENT_DAYS_THRESHOLD

    anchor_date = datetime.utcnow()
    dep_days = ac.payment_terms_deposit_days or 7
    bal_days = ac.payment_terms_balance_days or 45
    anchor   = ac.payment_terms_anchor or PaymentTermsAnchor.FROM_REQUEST

    if anchor == PaymentTermsAnchor.FROM_REQUEST:
        base = datetime.combine(booking.date_of_request, datetime.min.time()) if booking.date_of_request else anchor_date
    elif anchor == PaymentTermsAnchor.FROM_AUTHORIZATION:
        base = anchor_date   # will be recalculated when auth is granted
    else:  # before_trek
        trek_dt = datetime.combine(booking.trekking_date or booking.date, datetime.min.time())
        deposit_due = trek_dt - timedelta(days=bal_days)
        return deposit_due, deposit_due, False  # deposit = balance for before_trek

    deposit_due = base + timedelta(days=dep_days)

    if require_full:
        # Full payment due within deposit_days (one deadline)
        return deposit_due, deposit_due, True

    # Balance due anchor_days before trek
    trek_dt = datetime.combine(booking.trekking_date or booking.date, datetime.min.time())
    balance_due = trek_dt - timedelta(days=bal_days)
    return deposit_due, balance_due, False


def apply_rolling_deposit(
    db: Session,
    booking: Booking,
    ac: AgentClient,
    payment: Payment,
    created_by_id: int | None = None,
) -> bool:
    """
    Deduct the appropriate amount from the rolling deposit pot and record the transaction.
    Returns True if applied, False if insufficient balance.
    """
    days_left = _days_until_trek(booking)
    require_full = days_left <= FULL_PAYMENT_DAYS_THRESHOLD

    if require_full:
        amount = float(payment.amount or 0)
    else:
        amount = float(payment.deposit_amount or 0)

    if amount <= 0:
        return False

    if ac.rolling_deposit_balance < amount:
        return False   # insufficient — flag to finance, don't auto-apply

    ac.rolling_deposit_balance = round(ac.rolling_deposit_balance - amount, 2)

    note = (
        f"{'Full payment' if require_full else 'Deposit'} applied for booking "
        f"'{booking.booking_name}' (trek in {days_left} days)"
    )
    db.add(RollingDepositTransaction(
        agent_client_id=ac.id,
        booking_id=booking.id,
        type=RollingDepositTransactionType.APPLIED,
        amount=amount,
        balance_after=ac.rolling_deposit_balance,
        notes=note,
        created_by=created_by_id,
    ))

    # Mark payment as covered by rolling deposit
    if require_full:
        payment.deposit_paid  = payment.amount
        payment.balance_due   = 0
        payment.payment_status = PaymentStatus.FULLY_PAID
    else:
        payment.deposit_paid  = payment.deposit_amount
        payment.payment_status = PaymentStatus.DEPOSIT_PAID

    return True


def return_rolling_deposit(
    db: Session,
    booking: Booking,
    ac: AgentClient,
    amount: float,
    created_by_id: int | None = None,
    notes: str = "",
):
    """Restore funds to the rolling deposit after agent pays the booking."""
    ac.rolling_deposit_balance = round(ac.rolling_deposit_balance + amount, 2)

    db.add(RollingDepositTransaction(
        agent_client_id=ac.id,
        booking_id=booking.id,
        type=RollingDepositTransactionType.RETURNED,
        amount=amount,
        balance_after=ac.rolling_deposit_balance,
        notes=notes or f"Funds returned after payment received for '{booking.booking_name}'",
        created_by=created_by_id,
    ))


def top_up_rolling_deposit(
    db: Session,
    ac: AgentClient,
    amount: float,
    created_by_id: int | None = None,
    notes: str = "",
):
    """Finance admin records agent top-up (agent sent funds to replenish pot)."""
    ac.rolling_deposit_balance = round(ac.rolling_deposit_balance + amount, 2)

    db.add(RollingDepositTransaction(
        agent_client_id=ac.id,
        booking_id=None,
        type=RollingDepositTransactionType.TOP_UP,
        amount=amount,
        balance_after=ac.rolling_deposit_balance,
        notes=notes or "Agent top-up",
        created_by=created_by_id,
    ))


def adjust_rolling_deposit(
    db: Session,
    ac: AgentClient,
    amount: float,   # positive = add, negative = deduct
    created_by_id: int | None = None,
    notes: str = "",
):
    """Manual correction by finance admin."""
    ac.rolling_deposit_balance = round(ac.rolling_deposit_balance + amount, 2)

    db.add(RollingDepositTransaction(
        agent_client_id=ac.id,
        booking_id=None,
        type=RollingDepositTransactionType.ADJUSTMENT,
        amount=abs(amount),
        balance_after=ac.rolling_deposit_balance,
        notes=notes or "Manual adjustment",
        created_by=created_by_id,
    ))


def update_due_date(
    db: Session,
    payment: Payment,
    field: str,              # "deposit_due_date" or "balance_due_date"
    new_date: datetime,
    changed_by_id: int,
    reason: str = "",
):
    """Finance admin overrides a due date — logs the change for audit."""
    old_value = getattr(payment, field)
    setattr(payment, field, new_date)

    db.add(PaymentDueAudit(
        payment_id=payment.id,
        field_changed=field,
        old_value=old_value,
        new_value=new_date,
        reason=reason,
        changed_by=changed_by_id,
    ))
