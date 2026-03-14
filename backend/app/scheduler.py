"""
Daily background scheduler — runs booking/payment/slot maintenance jobs.

Jobs:
  1. advance_chase        — send weekly chase notifications; auto-release after 5
  2. detect_overdue       — flag bookings with overdue deposits → CHASE / AWAITING_AUTHORIZATION
  3. slot_alerts          — notify admins when gorilla (<20) or monkey (<10) slots are low
  4. topup_alerts         — remind finance + owner of upcoming 45-day balance due date
  5. passport_alerts      — alert admins about bookings with missing passport/voucher data
"""

import logging
from datetime import datetime, timedelta

from .database import SessionLocal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _db():
    return SessionLocal()


def _notify(db, user_id: int, title: str, message: str):
    from .routes.notifications import create_simple_notification
    create_simple_notification(db, user_id, title, message)


def _notify_role(db, roles, title: str, message: str):
    from .models.user import User
    users = db.query(User).filter(User.role.in_(roles)).all()
    for u in users:
        _notify(db, u.id, title, message)


# ---------------------------------------------------------------------------
# Job 1 — Chase advancement
# ---------------------------------------------------------------------------

def advance_chase():
    """
    For every ACTIVE ChaseRecord whose next_chase_at <= now:
      - Increment chase_count and send a reminder to the booking owner + admins
      - If chase_count reaches 5: auto-release booking → RELEASED, close chase
      - Otherwise: schedule next chase in 7 days
    """
    from .models.chase import ChaseRecord, ChaseStatus
    from .models.booking import BookingStatus
    from .models.user import UserRole

    db = _db()
    try:
        now = datetime.utcnow()
        from .services.email_service import email_chase_reminder, email_booking_released

        due = (
            db.query(ChaseRecord)
            .filter(
                ChaseRecord.status == ChaseStatus.ACTIVE,
                ChaseRecord.next_chase_at <= now,
            )
            .all()
        )

        released = 0
        chased = 0
        for record in due:
            booking = record.booking
            record.chase_count += 1
            record.last_chase_at = now

            if record.chase_count >= 5:
                # Auto-release after 5 weekly chases
                record.status = ChaseStatus.RELEASED
                booking.booking_status = BookingStatus.RELEASED
                # Notify owner
                _notify(
                    db, booking.user_id,
                    "Booking Released",
                    f"Your booking '{booking.booking_name}' has been released due to non-payment "
                    f"after {record.chase_count} reminders.",
                )
                if booking.user and booking.user.email:
                    email_booking_released(booking.user.email, booking.booking_name)
                # Notify admins
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.SUPERUSER],
                    "Booking Auto-Released",
                    f"Booking '{booking.booking_name}' was auto-released after 5 unanswered chase reminders.",
                )
                released += 1
            else:
                # Schedule next chase in 7 days
                record.next_chase_at = now + timedelta(days=7)
                next_date_str = record.next_chase_at.strftime("%Y-%m-%d")
                # Notify owner
                _notify(
                    db, booking.user_id,
                    f"Payment Reminder ({record.chase_count}/5)",
                    f"We have not yet received payment for your booking '{booking.booking_name}'. "
                    f"Please arrange payment urgently. Reminder {record.chase_count} of 5.",
                )
                if booking.user and booking.user.email:
                    email_chase_reminder(
                        booking.user.email, booking.booking_name,
                        record.chase_count, next_date_str
                    )
                # Notify admins
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.FINANCE_ADMIN],
                    f"Chase #{record.chase_count} Sent",
                    f"Chase reminder #{record.chase_count} sent to agent for booking '{booking.booking_name}'.",
                )
                chased += 1

        db.commit()
        if chased or released:
            logger.info(f"[Scheduler] chase: {chased} reminders sent, {released} bookings released")
    except Exception as exc:
        logger.error(f"[Scheduler] advance_chase error: {exc}")
        db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 2 — Detect overdue payments
# ---------------------------------------------------------------------------

def detect_overdue():
    """
    For CONFIRMED bookings where deposit_due_date has passed and payment is still PENDING:
      - Trusted/rolling → move to AWAITING_AUTHORIZATION
      - Untrusted       → move to CHASE (create ChaseRecord)
    """
    from .models.booking import Booking, BookingStatus
    from .models.payment import Payment, PaymentStatus
    from .models.chase import ChaseRecord, ChaseStatus
    from .models.user import UserRole

    db = _db()
    try:
        now = datetime.utcnow()
        overdue_bookings = (
            db.query(Booking)
            .join(Payment)
            .filter(
                Booking.booking_status == BookingStatus.CONFIRMED,
                Payment.payment_status == PaymentStatus.PENDING,
                Payment.deposit_due_date < now,
            )
            .all()
        )

        moved_auth = 0
        moved_chase = 0
        for booking in overdue_bookings:
            agent = booking.user
            if agent and (agent.is_trusted_agent or agent.has_rolling_deposit):
                booking.booking_status = BookingStatus.AWAITING_AUTHORIZATION
                _notify(
                    db, booking.user_id,
                    "Payment Overdue — Authorization Required",
                    f"Payment for booking '{booking.booking_name}' is overdue. "
                    f"Please submit an authorization request with proof of upcoming payment.",
                )
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.SUPERUSER],
                    "Overdue Booking → Awaiting Authorization",
                    f"Booking '{booking.booking_name}' payment is overdue. Agent is trusted — moved to Awaiting Authorization.",
                )
                moved_auth += 1
            else:
                # Check if already has an active chase record
                existing = db.query(ChaseRecord).filter(
                    ChaseRecord.booking_id == booking.id,
                    ChaseRecord.status == ChaseStatus.ACTIVE,
                ).first()
                if existing:
                    continue

                booking.booking_status = BookingStatus.CHASE
                chase = ChaseRecord(
                    booking_id=booking.id,
                    chase_count=1,
                    last_chase_at=now,
                    next_chase_at=now + timedelta(days=7),
                    status=ChaseStatus.ACTIVE,
                )
                db.add(chase)
                _notify(
                    db, booking.user_id,
                    "Payment Overdue — Urgent Reminder (1/5)",
                    f"Payment for booking '{booking.booking_name}' is overdue. "
                    f"Please arrange payment immediately. This is reminder 1 of 5.",
                )
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.FINANCE_ADMIN],
                    "Overdue Booking → Chase Started",
                    f"Booking '{booking.booking_name}' payment is overdue. Chase sequence started.",
                )
                moved_chase += 1

        db.commit()
        if moved_auth or moved_chase:
            logger.info(
                f"[Scheduler] detect_overdue: {moved_auth} → awaiting_auth, {moved_chase} → chase"
            )
    except Exception as exc:
        logger.error(f"[Scheduler] detect_overdue error: {exc}")
        db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 3 — Slot alerts
# ---------------------------------------------------------------------------

def slot_alerts():
    """
    Notify admins when available slots are low:
      - Gorilla: < 20 (threshold) on any upcoming date
      - Golden Monkey: < 10 on any upcoming date
    """
    from .models.available_slots import AvailableSlot
    from .models.golden_monkey_slots import GoldenMonkeySlot
    from .models.user import UserRole

    GORILLA_THRESHOLD = 20
    MONKEY_THRESHOLD = 10

    db = _db()
    try:
        today = datetime.utcnow().date()

        gorilla_low = (
            db.query(AvailableSlot)
            .filter(
                AvailableSlot.date >= today,
                AvailableSlot.available_slots < GORILLA_THRESHOLD,
                AvailableSlot.available_slots > 0,
            )
            .order_by(AvailableSlot.date)
            .limit(10)
            .all()
        )

        monkey_low = (
            db.query(GoldenMonkeySlot)
            .filter(
                GoldenMonkeySlot.date >= today,
                GoldenMonkeySlot.available_slots < MONKEY_THRESHOLD,
                GoldenMonkeySlot.available_slots > 0,
            )
            .order_by(GoldenMonkeySlot.date)
            .limit(10)
            .all()
        )

        if gorilla_low:
            dates_str = ", ".join(f"{s.date} ({s.available_slots} slots)" for s in gorilla_low)
            _notify_role(
                db, [UserRole.ADMIN, UserRole.SUPERUSER],
                "Low Gorilla Slots Alert",
                f"Gorilla slots below {GORILLA_THRESHOLD} on: {dates_str}",
            )

        if monkey_low:
            dates_str = ", ".join(f"{s.date} ({s.available_slots} slots)" for s in monkey_low)
            _notify_role(
                db, [UserRole.ADMIN, UserRole.SUPERUSER],
                "Low Golden Monkey Slots Alert",
                f"Golden Monkey slots below {MONKEY_THRESHOLD} on: {dates_str}",
            )

        db.commit()
        if gorilla_low or monkey_low:
            logger.info(
                f"[Scheduler] slot_alerts: {len(gorilla_low)} gorilla dates, {len(monkey_low)} monkey dates below threshold"
            )
    except Exception as exc:
        logger.error(f"[Scheduler] slot_alerts error: {exc}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 4 — 45-day top-up alerts (balance due reminders)
# ---------------------------------------------------------------------------

def topup_alerts():
    """
    For SECURED_DEPOSIT bookings where:
      - balance_due_date is within the next 45 days
      - payment is not yet FULLY_PAID
    Notify finance + booking owner.
    """
    from .models.booking import Booking, BookingStatus
    from .models.payment import Payment, PaymentStatus
    from .models.user import UserRole

    db = _db()
    try:
        now = datetime.utcnow()
        window_end = now + timedelta(days=45)

        bookings = (
            db.query(Booking)
            .join(Payment)
            .filter(
                Booking.booking_status == BookingStatus.SECURED_DEPOSIT,
                Payment.payment_status != PaymentStatus.FULLY_PAID,
                Payment.balance_due_date != None,
                Payment.balance_due_date <= window_end,
                Payment.balance_due_date >= now,
            )
            .all()
        )

        alerted = 0
        for booking in bookings:
            days_left = (booking.payment.balance_due_date - now).days
            _notify(
                db, booking.user_id,
                "Balance Due Soon",
                f"The remaining balance for booking '{booking.booking_name}' is due in {days_left} days "
                f"(by {booking.payment.balance_due_date.strftime('%Y-%m-%d')}). Please arrange the top-up payment.",
            )
            _notify_role(
                db, [UserRole.FINANCE_ADMIN, UserRole.ADMIN],
                "Balance Due in 45 Days",
                f"Booking '{booking.booking_name}' balance is due in {days_left} days.",
            )
            alerted += 1

        db.commit()
        if alerted:
            logger.info(f"[Scheduler] topup_alerts: {alerted} bookings alerted")
    except Exception as exc:
        logger.error(f"[Scheduler] topup_alerts error: {exc}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 5 — 45-day passport / voucher alerts
# ---------------------------------------------------------------------------

def passport_voucher_alerts():
    """
    For CONFIRMED / SECURED_* bookings with a trek date within the next 45 days:
      - Alert admin if passport data is missing for any traveller
      - Alert admin if voucher has not been issued
    """
    from .models.booking import Booking, BookingStatus
    from .models.passport_data import PassportData
    from .models.user import UserRole

    UPCOMING_DAYS = 45
    relevant_statuses = [
        BookingStatus.CONFIRMED,
        BookingStatus.SECURED_FULL,
        BookingStatus.SECURED_DEPOSIT,
        BookingStatus.SECURED_AUTHORIZATION,
    ]

    db = _db()
    try:
        now = datetime.utcnow()
        cutoff = (now + timedelta(days=UPCOMING_DAYS)).date()
        today = now.date()

        bookings = (
            db.query(Booking)
            .filter(
                Booking.booking_status.in_(relevant_statuses),
                Booking.date != None,
                Booking.date <= cutoff,
                Booking.date >= today,
            )
            .all()
        )

        alerted_passport = 0
        alerted_voucher = 0
        for booking in bookings:
            passport_count = (
                db.query(PassportData)
                .filter(PassportData.booking_id == booking.id)
                .count()
            )
            expected = booking.people or 1
            if passport_count < expected:
                missing = expected - passport_count
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.SUPERUSER],
                    "Missing Passport Data",
                    f"Booking '{booking.booking_name}' (trek on {booking.date}) is missing passport data "
                    f"for {missing} traveller(s). Only {passport_count}/{expected} uploaded.",
                )
                alerted_passport += 1

            # Check voucher — if booking has a linked voucher record use it; otherwise notify
            if not getattr(booking, 'voucher', None):
                _notify_role(
                    db, [UserRole.ADMIN, UserRole.SUPERUSER],
                    "Voucher Not Yet Issued",
                    f"Booking '{booking.booking_name}' (trek on {booking.date}) has no voucher issued yet.",
                )
                alerted_voucher += 1

        db.commit()
        if alerted_passport or alerted_voucher:
            logger.info(
                f"[Scheduler] passport_voucher_alerts: {alerted_passport} missing passport, {alerted_voucher} missing voucher"
            )
    except Exception as exc:
        logger.error(f"[Scheduler] passport_voucher_alerts error: {exc}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------

def create_scheduler():
    """
    Build and return a configured APScheduler AsyncIOScheduler.
    Call scheduler.start() in lifespan startup and scheduler.shutdown() on exit.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    scheduler = AsyncIOScheduler()

    # Chase advancement — every hour (catches due records promptly)
    scheduler.add_job(advance_chase, IntervalTrigger(hours=1), id="advance_chase", replace_existing=True)

    # Overdue detection — daily at 06:00 UTC
    scheduler.add_job(detect_overdue, CronTrigger(hour=6, minute=0), id="detect_overdue", replace_existing=True)

    # Slot alerts — daily at 07:00 UTC
    scheduler.add_job(slot_alerts, CronTrigger(hour=7, minute=0), id="slot_alerts", replace_existing=True)

    # Top-up / balance due alerts — daily at 07:30 UTC
    scheduler.add_job(topup_alerts, CronTrigger(hour=7, minute=30), id="topup_alerts", replace_existing=True)

    # Passport / voucher alerts — daily at 08:00 UTC
    scheduler.add_job(
        passport_voucher_alerts, CronTrigger(hour=8, minute=0),
        id="passport_voucher_alerts", replace_existing=True,
    )

    return scheduler
