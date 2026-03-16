"""
Comprehensive scenario seeder — covers every workflow and AR/AP state.

Each scenario is annotated with where it appears:
  [AR]          — Accounts Receivable tab (money owed by agent)
  [AP]          — Accounts Payable tab (permit purchased from park)
  [AR+AP]       — Both (permit purchased AND balance still owed)
  [RD]          — Rolling deposit involved
  [OVERDUE]     — Overdue payment
  [-]           — Neither (no outstanding finance action)

Run: python seed_scenarios.py
Safe to re-run: existing SCN-prefixed bookings are cleaned up first.
"""
from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus, ValidationStatus
from app.models.authorization import AuthorizationRequest, Appeal
from app.models.chase import ChaseRecord, ChaseStatus
from app.models.amendment import AmendmentRequest, AmendmentStatus, AmendmentFeeType
from app.models.cancellation import CancellationRequest, CancellationStatus
from app.models.site import Site, Product
from app.models.user import User, UserRole
from app.models.agent_client import (
    AgentClient, AgentClientType, PaymentTermsAnchor,
    RollingDepositTransaction, RollingDepositTransactionType,
)
from datetime import datetime, timedelta, date
import random, string


def ref():
    return "SCN" + "".join(random.choices(string.digits, k=6))


def run():
    with SessionLocal() as db:
        # ── Clean up previous scenario runs ─────────────────────────────────
        old = db.query(Booking).filter(Booking.booking_ref.like("SCN%")).all()
        old_ids = [b.id for b in old]
        if old_ids:
            # Delete child records first to avoid FK constraint violations
            from app.models.amendment import AmendmentRequest
            from app.models.cancellation import CancellationRequest
            from app.models.authorization import AuthorizationRequest
            from app.models.payment import Payment
            from app.models.agent_client import RollingDepositTransaction

            db.query(AmendmentRequest).filter(AmendmentRequest.booking_id.in_(old_ids)).delete(synchronize_session=False)
            db.query(CancellationRequest).filter(CancellationRequest.booking_id.in_(old_ids)).delete(synchronize_session=False)
            auth_ids = [a.id for a in db.query(AuthorizationRequest).filter(AuthorizationRequest.booking_id.in_(old_ids)).all()]
            if auth_ids:
                from app.models.authorization import Appeal
                db.query(Appeal).filter(Appeal.authorization_request_id.in_(auth_ids)).delete(synchronize_session=False)
            db.query(AuthorizationRequest).filter(AuthorizationRequest.booking_id.in_(old_ids)).delete(synchronize_session=False)
            from app.models.chase import ChaseRecord
            db.query(ChaseRecord).filter(ChaseRecord.booking_id.in_(old_ids)).delete(synchronize_session=False)
            db.query(RollingDepositTransaction).filter(RollingDepositTransaction.booking_id.in_(old_ids)).delete(synchronize_session=False)
            db.query(Payment).filter(Payment.booking_id.in_(old_ids)).delete(synchronize_session=False)
            for b in old:
                db.delete(b)
        db.commit()

        # ── Resolve users ────────────────────────────────────────────────────
        admin     = db.query(User).filter(User.role == UserRole.ADMIN).first()
        finance   = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).first()
        auth_user = db.query(User).filter(User.role == UserRole.AUTHORIZER).first()
        user      = db.query(User).filter(User.email == "user@test.com").first()

        # ── Resolve products / sites ─────────────────────────────────────────
        site_vol = db.query(Site).filter(Site.name.ilike("%Volcano%")).first()
        site_nyu = db.query(Site).filter(Site.name.ilike("%Nyungwe%")).first()
        gorilla  = db.query(Product).filter(Product.name.ilike("%gorilla%")).first()
        monkey   = db.query(Product).filter(Product.name.ilike("%golden%")).first()
        chimps   = db.query(Product).filter(Product.name.ilike("%chimp%"), ~Product.name.ilike("%exclusive%")).first()
        canopy   = db.query(Product).filter(Product.name.ilike("%canopy walk%"), ~Product.name.ilike("%exclusive%")).first()
        bisoke   = db.query(Product).filter(Product.name.ilike("%bisoke%")).first()

        today = date.today()

        # ── Agent / Client profiles ──────────────────────────────────────────
        def get_or_create_ac(name, type_, trusted, rd, limit=0,
                             dep_days=7, bal_days=45,
                             anchor=PaymentTermsAnchor.FROM_REQUEST):
            ac = db.query(AgentClient).filter_by(name=name).first()
            if not ac:
                ac = AgentClient(
                    name=name, type=type_, is_trusted=trusted,
                    has_rolling_deposit=rd,
                    payment_terms_deposit_days=dep_days,
                    payment_terms_balance_days=bal_days,
                    payment_terms_anchor=anchor,
                    rolling_deposit_limit=limit,
                    rolling_deposit_balance=limit,
                )
                db.add(ac)
                db.flush()
            return ac

        # Three agent profiles covering different trust / payment configurations
        ta  = get_or_create_ac("Demo Trusted Agency",   AgentClientType.AGENT,  True,  False,
                               dep_days=7, bal_days=45)
        ua  = get_or_create_ac("Demo Untrusted Client", AgentClientType.CLIENT, False, False,
                               dep_days=3, bal_days=30)
        rda = get_or_create_ac("Rolling Deposit Agent", AgentClientType.AGENT,  True,  True,
                               limit=15000, dep_days=7, bal_days=45)

        # ── Helpers ───────────────────────────────────────────────────────────

        def make_booking(name, status, prod, site, people, ac,
                         trek_offset=90, req_offset=20):
            trek_dt = today + timedelta(days=trek_offset)
            req_dt  = today - timedelta(days=req_offset)
            b = Booking(
                booking_name=name, booking_ref=ref(), product=prod.name,
                product_id=prod.id, site_id=site.id, people=people,
                number_of_permits=people, date=trek_dt, trekking_date=trek_dt,
                date_of_request=req_dt, head_of_file=name.split()[0],
                agent_client=ac.name[:3].upper(), agent_client_id=ac.id,
                booking_status=status, user_id=user.id,
                created_at=datetime.utcnow() - timedelta(days=req_offset),
            )
            db.add(b)
            db.flush()
            return b

        def make_payment(b, prod, people, pstatus, vstatus,
                         deposit_paid=0, dep_due_offset=7,
                         bal_trek_offset=45, overdue=False, validated_by=None):
            unit  = float(prod.unit_cost)
            total = unit * people
            dep   = round(total * 0.3, 2)
            now   = datetime.utcnow()
            dep_due = (now - timedelta(days=3)) if overdue else (now + timedelta(days=dep_due_offset))
            trek_dt = datetime.combine(b.trekking_date, datetime.min.time())
            bal_due = trek_dt - timedelta(days=bal_trek_offset)
            p = Payment(
                booking_id=b.id, payment_status=pstatus,
                validation_status=vstatus, unit_cost=unit, units=people,
                amount=total, deposit_amount=dep, deposit_paid=deposit_paid,
                balance_due=max(total - deposit_paid, 0),
                deposit_due_date=dep_due, balance_due_date=bal_due,
                validated_by=validated_by,
                validated_at=datetime.utcnow() if validated_by else None,
            )
            db.add(p)
            db.flush()
            return p

        def make_auth(b, status, auto=False, notes=""):
            ar = AuthorizationRequest(
                booking_id=b.id, reason="Payment proof submitted by agent",
                status=status, requested_by=user.id, auto_flagged=auto,
                deadline=datetime.utcnow() + timedelta(days=7),
            )
            if notes:
                ar.authorizer_notes = notes
                ar.authorizer_id = (auth_user or admin).id
            db.add(ar)
            db.flush()
            return ar

        def make_chase(b, count, status=ChaseStatus.ACTIVE):
            last = datetime.utcnow() - timedelta(days=7 * count)
            db.add(ChaseRecord(
                booking_id=b.id, chase_count=count,
                last_chase_at=last, next_chase_at=last + timedelta(days=7),
                status=status,
            ))
            db.flush()

        def rd_apply(b, prod, people, full=False):
            """Apply rolling deposit funds for a booking."""
            unit  = float(prod.unit_cost)
            total = unit * people
            dep   = round(total * 0.3, 2)
            amount = total if full else dep
            rda.rolling_deposit_balance = round((rda.rolling_deposit_balance or 0) - amount, 2)
            db.add(RollingDepositTransaction(
                agent_client_id=rda.id, booking_id=b.id,
                type=RollingDepositTransactionType.APPLIED,
                amount=amount, balance_after=rda.rolling_deposit_balance,
                notes=f"{'Full' if full else 'Deposit'} applied — {'<' if full else '>'}45 days to trek",
                created_by=admin.id,
            ))
            db.flush()
            return amount

        def rd_return(b, amount):
            """Return funds to rolling deposit pot after agent pays."""
            rda.rolling_deposit_balance = round((rda.rolling_deposit_balance or 0) + amount, 2)
            db.add(RollingDepositTransaction(
                agent_client_id=rda.id, booking_id=b.id,
                type=RollingDepositTransactionType.RETURNED,
                amount=amount, balance_after=rda.rolling_deposit_balance,
                notes="Agent payment received — funds returned to pot",
                created_by=(finance or admin).id,
            ))
            db.flush()

        created = []

        # ════════════════════════════════════════════════════════════════════
        # GROUP 1 — STANDARD AGENT FLOW  (Trusted agent, no rolling deposit)
        # ════════════════════════════════════════════════════════════════════

        # [AR] Booking confirmed — deposit owed, not yet paid
        b = make_booking("Standard Confirmed Deposit Due", BookingStatus.CONFIRMED, gorilla, site_vol, 2, ta, 90, 10)
        make_payment(b, gorilla, 2, PaymentStatus.PENDING, ValidationStatus.PENDING, dep_due_offset=5)
        created.append("[AR]         Standard confirmed — deposit due in 5 days")

        # [AR][OVERDUE] Confirmed booking — deposit overdue
        b = make_booking("Overdue Deposit Gorilla", BookingStatus.CONFIRMED, gorilla, site_vol, 2, ta, 60, 20)
        make_payment(b, gorilla, 2, PaymentStatus.PENDING, ValidationStatus.PENDING, overdue=True)
        created.append("[AR][OVERDUE] Confirmed — deposit overdue")

        # [AR][OVERDUE] Trek in 7 days — CRITICAL urgency — deposit overdue
        b = make_booking("CRITICAL Trek 7-Days Out", BookingStatus.CONFIRMED, gorilla, site_vol, 4, ta, 7, 30)
        make_payment(b, gorilla, 4, PaymentStatus.PENDING, ValidationStatus.PENDING, overdue=True)
        created.append("[AR][OVERDUE] CRITICAL urgency — trek in 7 days")

        # [AR] Trek in 14 days — HIGH urgency — deposit nearly due
        b = make_booking("HIGH Trek 14-Days Out", BookingStatus.CONFIRMED, monkey, site_vol, 2, ta, 14, 30)
        make_payment(b, monkey, 2, PaymentStatus.PENDING, ValidationStatus.PENDING, dep_due_offset=2)
        created.append("[AR]         HIGH urgency — trek in 14 days")

        # [-] Solo provisional — nothing due yet (no payment record)
        make_booking("Solo Gorilla Provisional", BookingStatus.PROVISIONAL, gorilla, site_vol, 1, ta, 150)
        created.append("[-]          Provisional — no finance action")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 2 — AUTHORIZATION WORKFLOW
        # ════════════════════════════════════════════════════════════════════

        # [AR] Auto-flagged — awaiting authorizer decision
        b = make_booking("Auto-Flagged Gorilla Trek", BookingStatus.AWAITING_AUTHORIZATION, gorilla, site_vol, 2, ta, 80)
        make_payment(b, gorilla, 2, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE)
        make_auth(b, "pending", auto=True)
        created.append("[AR]         Auth: auto-flagged pending")

        # [AR] Manually submitted — awaiting decision
        b = make_booking("Hansen Family Gorillas", BookingStatus.AWAITING_AUTHORIZATION, gorilla, site_vol, 4, ta, 65)
        make_payment(b, gorilla, 4, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE)
        make_auth(b, "pending")
        created.append("[AR]         Auth: manually submitted pending")

        # [AR] Authorized — ready for permit purchase, payment pending
        b = make_booking("Chen Group Authorized", BookingStatus.AUTHORIZED, monkey, site_vol, 3, ta, 55)
        make_payment(b, monkey, 3, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE)
        make_auth(b, "authorized", notes="Wire transfer confirmed, proceed")
        created.append("[AR]         Auth: approved — awaiting permit purchase")

        # [AP] Authorized booking -> permits purchased (SECURED_AUTHORIZATION)
        b = make_booking("Garcia Authorized Secured", BookingStatus.SECURED_AUTHORIZATION, gorilla, site_vol, 2, ta, 50)
        make_payment(b, gorilla, 2, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=float(gorilla.unit_cost) * 2, validated_by=finance.id if finance else None)
        make_auth(b, "authorized", notes="Fully authorized, permits purchased")
        created.append("[AP]         Secured under authorization — fully paid")

        # [AR] Declined + appeal pending
        b = make_booking("Patel Appeal Pending", BookingStatus.AWAITING_AUTHORIZATION, gorilla, site_vol, 2, ta, 70)
        make_payment(b, gorilla, 2, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE)
        ar = make_auth(b, "declined", notes="Insufficient proof")
        db.add(Appeal(authorization_request_id=ar.id,
            appeal_notes="Attaching updated bank statement.", status="pending"))
        db.flush()
        created.append("[AR]         Auth: declined + appeal PENDING")

        # [AR] Declined + appeal rejected -> chase
        b = make_booking("Kim Declined->Chase", BookingStatus.CHASE, gorilla, site_vol, 1, ua, 45)
        make_payment(b, gorilla, 1, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE, overdue=True)
        ar = make_auth(b, "declined", notes="No valid proof")
        db.add(Appeal(authorization_request_id=ar.id,
            appeal_notes="Nothing new provided.", status="rejected",
            reviewed_by=(auth_user or admin).id))
        db.flush()
        make_chase(b, 1)
        created.append("[AR][OVERDUE] Auth declined + appeal rejected -> chase")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 3 — CHASE WORKFLOW  (Untrusted agent, no payment)
        # ════════════════════════════════════════════════════════════════════

        # [AR] Chase count 1 — just started
        b = make_booking("Rossi Chase Count-1", BookingStatus.CHASE, canopy, site_nyu, 2, ua, 50)
        make_payment(b, canopy, 2, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE)
        make_chase(b, 1)
        created.append("[AR]         Chase count=1 (just started)")

        # [AR][OVERDUE] Chase count 3 — mid-chase, payment overdue
        b = make_booking("Osei Chase Count-3", BookingStatus.CHASE, gorilla, site_vol, 3, ua, 35)
        make_payment(b, gorilla, 3, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE, overdue=True)
        make_chase(b, 3)
        created.append("[AR][OVERDUE] Chase count=3 (mid-chase, overdue)")

        # [AR][OVERDUE] Chase count 5 — final chase, about to release
        b = make_booking("Nguyen Chase Count-5", BookingStatus.CHASE, monkey, site_vol, 2, ua, 25)
        make_payment(b, monkey, 2, PaymentStatus.PENDING, ValidationStatus.DO_NOT_PURCHASE, overdue=True)
        make_chase(b, 5)
        created.append("[AR][OVERDUE] Chase count=5 (final, about to release)")

        # [-] Released after 5 failed chases — no longer chasing
        b = make_booking("Ali Trek Released", BookingStatus.RELEASED, gorilla, site_vol, 2, ua, 20)
        make_payment(b, gorilla, 2, PaymentStatus.CANCELLED, ValidationStatus.DO_NOT_PURCHASE, overdue=True)
        make_chase(b, 5, ChaseStatus.RELEASED)
        created.append("[-]          Released after 5 chases — removed from AR")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 4 — PERMIT PURCHASED  (AP entries)
        # ════════════════════════════════════════════════════════════════════

        # [AR+AP] Secured deposit — permit purchased but BALANCE STILL OWED
        b = make_booking("Secured Deposit Balance Due", BookingStatus.SECURED_DEPOSIT, monkey, site_vol, 3, ta, 40)
        dep = round(float(monkey.unit_cost) * 3 * 0.3, 2)
        make_payment(b, monkey, 3, PaymentStatus.DEPOSIT_PAID, ValidationStatus.OK_TO_PURCHASE_DEPOSIT,
                     deposit_paid=dep, bal_trek_offset=50,
                     validated_by=finance.id if finance else None)
        created.append("[AR+AP]      Secured deposit — permit bought, balance owed")

        # [AR+AP][OVERDUE] Secured deposit — balance overdue
        b = make_booking("Secured Deposit Balance OVERDUE", BookingStatus.SECURED_DEPOSIT, gorilla, site_vol, 2, ta, 30)
        dep = round(float(gorilla.unit_cost) * 2 * 0.3, 2)
        p = make_payment(b, gorilla, 2, PaymentStatus.DEPOSIT_PAID, ValidationStatus.OK_TO_PURCHASE_DEPOSIT,
                         deposit_paid=dep, bal_trek_offset=35,
                         validated_by=finance.id if finance else None)
        # force balance_due_date into the past
        p.balance_due_date = datetime.utcnow() - timedelta(days=5)
        db.flush()
        created.append("[AR+AP][OVERDUE] Secured deposit — balance overdue")

        # [AP] Secured full — permit purchased, fully paid
        b = make_booking("Secured Full Gorilla", BookingStatus.SECURED_FULL, gorilla, site_vol, 2, ta, 110)
        make_payment(b, gorilla, 2, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=float(gorilla.unit_cost) * 2,
                     validated_by=finance.id if finance else None)
        created.append("[AP]         Secured full — fully paid, AP only")

        # [AP] Large group gorilla — fully paid (group booking)
        b = make_booking("Corporate Gorilla 8-Pax", BookingStatus.SECURED_FULL, gorilla, site_vol, 8, ta, 120)
        make_payment(b, gorilla, 8, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=float(gorilla.unit_cost) * 8,
                     validated_by=finance.id if finance else None)
        created.append("[AP]         Large group 8-pax — fully paid")

        # [AP] Chimps Nyungwe — different product / site
        b = make_booking("Nyungwe Chimps Group", BookingStatus.SECURED_FULL, chimps, site_nyu, 6, ta, 100)
        make_payment(b, chimps, 6, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=float(chimps.unit_cost) * 6,
                     validated_by=finance.id if finance else None)
        created.append("[AP]         Chimps Nyungwe — secured full")

        # [AP] Bisoke climb — volcano site variety
        b = make_booking("Bisoke Volcano Climb", BookingStatus.CONFIRMED, bisoke, site_vol, 6, ta, 55)
        make_payment(b, bisoke, 6, PaymentStatus.PENDING, ValidationStatus.PENDING)
        created.append("[AR]         Bisoke confirmed — deposit pending")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 5 — ROLLING DEPOSIT SCENARIOS
        # ════════════════════════════════════════════════════════════════════

        # [AR][RD] Confirmed — deposit applied from RD pot (trek >45 days)
        b = make_booking("RD Deposit Applied Trek 90d", BookingStatus.CONFIRMED, gorilla, site_vol, 2, rda, 90)
        dep = round(float(gorilla.unit_cost) * 2 * 0.3, 2)
        make_payment(b, gorilla, 2, PaymentStatus.DEPOSIT_PAID, ValidationStatus.PENDING, deposit_paid=dep)
        rd_apply(b, gorilla, 2, full=False)
        created.append("[AR][RD]     RD deposit applied (trek 90d, balance still owed)")

        # [AR+AP][RD] Secured deposit — full amount from RD pot (trek <45 days)
        b = make_booking("RD Full Applied Secured Trek 30d", BookingStatus.SECURED_FULL, gorilla, site_vol, 2, rda, 30)
        total = float(gorilla.unit_cost) * 2
        make_payment(b, gorilla, 2, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=total, validated_by=finance.id if finance else None)
        rd_apply(b, gorilla, 2, full=True)
        created.append("[AP][RD]     RD full amount applied — trek <45 days, AP only (fully paid via RD)")

        # [AP][RD] RD returned — agent paid invoice, pot restored
        b = make_booking("RD Returned Agent Paid", BookingStatus.SECURED_FULL, monkey, site_vol, 5, rda, 120)
        total = float(monkey.unit_cost) * 5
        dep   = round(total * 0.3, 2)
        make_payment(b, monkey, 5, PaymentStatus.FULLY_PAID, ValidationStatus.OK_TO_PURCHASE_FULL,
                     deposit_paid=total, validated_by=finance.id if finance else None)
        rd_apply(b, monkey, 5, full=False)
        rd_return(b, dep)
        created.append("[AP][RD]     RD returned — agent paid, pot restored")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 6 — AMENDMENT & CANCELLATION  (still in AR)
        # ════════════════════════════════════════════════════════════════════

        # [AR] Amendment pending — deposit paid, balance still owed
        b = make_booking("Amendment Pending Balance Owed", BookingStatus.AMENDMENT_REQUESTED, monkey, site_vol, 3, ta, 60)
        make_payment(b, monkey, 3, PaymentStatus.DEPOSIT_PAID, ValidationStatus.OK_TO_PURCHASE_DEPOSIT,
                     deposit_paid=round(float(monkey.unit_cost) * 3 * 0.3, 2))
        db.add(AmendmentRequest(booking_id=b.id, requested_by=user.id,
            original_date=b.trekking_date,
            requested_date=b.trekking_date + timedelta(days=14),
            reason="Two clients changed travel dates",
            status=AmendmentStatus.PENDING,
            fee_type=AmendmentFeeType.SAME_YEAR_20PCT, fee_amount=0))
        db.flush()
        created.append("[AR]         Amendment PENDING — balance owed (shows in AR)")

        # [AP][AR] Amendment confirmed — secured, balance owed
        b = make_booking("Amendment Confirmed Secured", BookingStatus.SECURED_DEPOSIT, gorilla, site_vol, 2, ta, 75)
        dep = round(float(gorilla.unit_cost) * 2 * 0.3, 2)
        make_payment(b, gorilla, 2, PaymentStatus.DEPOSIT_PAID, ValidationStatus.OK_TO_PURCHASE_DEPOSIT,
                     deposit_paid=dep, validated_by=finance.id if finance else None)
        db.add(AmendmentRequest(booking_id=b.id, requested_by=user.id,
            original_date=b.trekking_date - timedelta(days=30),
            requested_date=b.trekking_date,
            reason="Client changed travel dates",
            status=AmendmentStatus.CONFIRMED,
            fee_type=AmendmentFeeType.SAME_YEAR_20PCT, fee_amount=150,
            confirmed_by=admin.id))
        db.flush()
        created.append("[AR+AP]      Amendment CONFIRMED — secured deposit, balance owed")

        # [AR] Cancellation pending — deposit paid, refund decision needed
        b = make_booking("Cancellation Pending Refund Decision", BookingStatus.CANCELLATION_REQUESTED, chimps, site_nyu, 2, ua, 20)
        make_payment(b, chimps, 2, PaymentStatus.DEPOSIT_PAID, ValidationStatus.OK_TO_PURCHASE_DEPOSIT,
                     deposit_paid=round(float(chimps.unit_cost) * 2 * 0.3, 2))
        db.add(CancellationRequest(booking_id=b.id, requested_by=user.id,
            reason="Change of plans", status=CancellationStatus.PENDING))
        db.flush()
        created.append("[AR]         Cancellation PENDING — deposit paid (refund decision needed)")

        # [-] Cancellation confirmed — no longer owed
        b = make_booking("Cancelled Medical Emergency", BookingStatus.CANCELLED, gorilla, site_vol, 2, ta, 30)
        make_payment(b, gorilla, 2, PaymentStatus.CANCELLED, ValidationStatus.DO_NOT_PURCHASE, deposit_paid=900)
        db.add(CancellationRequest(booking_id=b.id, requested_by=user.id,
            reason="Medical emergency", status=CancellationStatus.CONFIRMED,
            confirmed_by=admin.id))
        db.flush()
        created.append("[-]          Cancellation CONFIRMED — removed from AR")

        # ════════════════════════════════════════════════════════════════════
        # GROUP 7 — PRODUCT / SITE VARIETY
        # ════════════════════════════════════════════════════════════════════

        # [-] Requested — no payment yet (voucher submitted, not confirmed)
        make_booking("Solo Canopy Walker", BookingStatus.REQUESTED, canopy, site_nyu, 1, ua, 45)
        created.append("[-]          Requested — voucher submitted, awaiting confirmation")

        db.commit()

        print(f"\nCreated {len(created)} scenario bookings:\n")
        print(f"  {'Scenario':<55} {'Finance Visibility'}")
        print(f"  {'-'*55} {'-'*20}")
        for i, c in enumerate(created, 1):
            print(f"  {i:2}. {c}")

        print("\nAR/AP Coverage Summary")
        print("=" * 40)
        print("  AR  (receivable)  : Groups 1, 2, 3, 6 + AR+AP overlap")
        print("  AP  (payable)     : Groups 4, 5 + AR+AP overlap")
        print("  RD  (rolling dep) : Group 5")
        print("  [-] (no action)   : Provisional, Released, Cancelled, Requested")


if __name__ == "__main__":
    run()
