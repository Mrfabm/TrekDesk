from contextlib import asynccontextmanager
import asyncio
import sys
import os
import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import api_router, auth, users, bookings, notifications, finance, passport, voucher, authorization
from .database import Base, engine, SessionLocal
from .models.agent_client import AgentClient  # ensure table is created

# Create database tables
Base.metadata.create_all(bind=engine)

logger = logging.getLogger(__name__)


def backfill_missing_payments(db):
    """Create Payment records for any confirmed/requested/VR bookings that have none."""
    from .models.booking import Booking, BookingStatus
    from .models.payment import Payment, PaymentStatus, ValidationStatus
    from datetime import timedelta

    needs_payment = [
        BookingStatus.CONFIRMED, BookingStatus.REQUESTED, BookingStatus.VR,
        BookingStatus.AWAITING_AUTHORIZATION, BookingStatus.CHASE,
        BookingStatus.SECURED_FULL, BookingStatus.SECURED_DEPOSIT,
        BookingStatus.SECURED_AUTHORIZATION,
    ]
    bookings = db.query(Booking).filter(Booking.booking_status.in_(needs_payment)).all()
    created = 0
    for booking in bookings:
        if booking.payment:
            continue
        unit_cost = float(booking.product_rel.unit_cost) if booking.product_rel else 0
        units = booking.people or 0
        total = unit_cost * units
        deposit_amount = round(total * 0.3, 2)
        balance_due_date = (
            booking.date - timedelta(days=45)
            if booking.date and hasattr(booking.date, '__sub__')
            else datetime.utcnow() + timedelta(days=30)
        )
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
            deposit_due_date=datetime.utcnow() + timedelta(days=14),
            balance_due_date=balance_due_date,
        )
        db.add(payment)
        created += 1
    if created:
        db.commit()
        logger.info(f"Backfilled {created} missing payment records")


def migrate_booking_status_enum():
    """
    Add new BookingStatus values (as uppercase Python names) to the PostgreSQL native enum.
    SQLAlchemy stores enum NAMES (not values) for native PG enums, so labels must be uppercase.
    Also converts any legacy lowercase labels in existing rows to uppercase.
    Must run in AUTOCOMMIT — ALTER TYPE ADD VALUE is forbidden inside a transaction.
    """
    from sqlalchemy import text
    # Uppercase enum names (what SQLAlchemy stores)
    new_names = [
        "AWAITING_AUTHORIZATION",
        "CHASE",
        "RELEASED",
        "SECURED_FULL",
        "SECURED_DEPOSIT",
        "SECURED_AUTHORIZATION",
        "AMENDMENT_REQUESTED",
        "CANCELLATION_REQUESTED",
        "CANCELLED",
        "AUTHORIZED",
    ]
    # Map from old lowercase values (wrongly added previously) to correct uppercase names
    lowercase_to_upper = {
        "awaiting_authorization": "AWAITING_AUTHORIZATION",
        "chase": "CHASE",
        "released": "RELEASED",
        "secured_full": "SECURED_FULL",
        "secured_deposit": "SECURED_DEPOSIT",
        "secured_authorization": "SECURED_AUTHORIZATION",
        "amendment_requested": "AMENDMENT_REQUESTED",
        "cancellation_requested": "CANCELLATION_REQUESTED",
        "cancelled": "CANCELLED",
    }
    try:
        with engine.connect() as conn:
            conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            for name in new_names:
                conn.execute(text(f"ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS '{name}'"))
            # Migrate existing rows with legacy lowercase labels
            for old, new in lowercase_to_upper.items():
                conn.execute(text(
                    f"UPDATE bookings SET booking_status = '{new}'::bookingstatus "
                    f"WHERE booking_status::text = '{old}'"
                ))
        logger.info("bookingstatus enum updated with uppercase names")
    except Exception as exc:
        logger.warning(f"bookingstatus enum migration skipped: {exc}")


def migrate_users_role_enum(db):
    """
    Add 'AUTHORIZER' to the PostgreSQL native enum type 'userrole'.
    Must run outside a transaction (AUTOCOMMIT) — PostgreSQL forbids
    ALTER TYPE ... ADD VALUE inside a transaction block.
    """
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'AUTHORIZER'"))
        logger.info("userrole enum updated — AUTHORIZER added")
    except Exception as exc:
        logger.warning(f"userrole enum migration skipped: {exc}")


def seed_superuser(db):
    """Ensure the superuser account exists."""
    from .models.user import User, UserRole
    from passlib.context import CryptContext

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    email = "admin@example.com"
    if db.query(User).filter(User.email == email).first():
        return
    user = User(
        email=email,
        username="superuser",
        hashed_password=pwd_ctx.hash("admin123"),
        role=UserRole.SUPERUSER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    logger.info("Seeded admin@example.com (superuser)")


def seed_authorizer_user(db):
    """Ensure the test authorizer account exists."""
    from .models.user import User, UserRole
    from passlib.context import CryptContext

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    email = "authorizer@test.com"
    if db.query(User).filter(User.email == email).first():
        return
    user = User(
        email=email,
        username="authorizer",
        hashed_password=pwd_ctx.hash("auth123"),
        role=UserRole.AUTHORIZER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    logger.info("Seeded authorizer@test.com")


def auto_flag_authorization_requests(db):
    """
    Auto-create authorization requests for bookings that:
    - Have been pending payment for more than 14 days, OR
    - Are non-provisional with available slots < 10
    (Idempotent: skips bookings that already have a pending auth request.)
    """
    from .models.booking import Booking, BookingStatus
    from .models.payment import Payment, PaymentStatus
    from .models.authorization import AuthorizationRequest
    from .models.user import User, UserRole
    from .models.available_slots import AvailableSlot
    from .models.golden_monkey_slots import GoldenMonkeySlot
    from .routes.authorization import create_auth_request_for_booking
    from datetime import timedelta

    # Find a system admin to attribute auto-flag requests to
    system_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not system_user:
        return

    now = datetime.utcnow()
    today = now.date()
    cutoff = now - timedelta(days=14)

    non_provisional = [
        BookingStatus.REQUESTED, BookingStatus.VR, BookingStatus.CONFIRMED,
        BookingStatus.AWAITING_AUTHORIZATION,
    ]

    bookings = (
        db.query(Booking)
        .join(Payment, isouter=True)
        .filter(Booking.booking_status.in_(non_provisional))
        .all()
    )

    flagged = 0
    for booking in bookings:
        # Already has a pending request → skip
        has_pending = db.query(AuthorizationRequest).filter(
            AuthorizationRequest.booking_id == booking.id,
            AuthorizationRequest.status == "pending",
        ).first()
        if has_pending:
            continue

        reason = None

        # Check available slots < 10
        if booking.date and booking.product:
            product_lower = booking.product.lower()
            if "gorilla" in product_lower or "mountain" in product_lower:
                slot_row = db.query(AvailableSlot).filter(
                    AvailableSlot.date == booking.date
                ).first()
                slots = slot_row.available_slots if slot_row else None
            else:
                slot_row = db.query(GoldenMonkeySlot).filter(
                    GoldenMonkeySlot.date == booking.date
                ).first()
                slots = slot_row.available_slots if slot_row else None

            if slots is not None and slots < 10:
                reason = f"Critical: only {slots} slots available for trek on {booking.date}"

        # Payment overdue checks (only if no slots reason already found)
        if not reason and booking.payment:
            if (
                booking.payment.payment_status == PaymentStatus.PENDING
                and booking.payment.deposit_due_date
                and booking.payment.deposit_due_date < now
            ):
                reason = "Deposit overdue — no payment received after deadline"
            elif (
                booking.payment.payment_status == PaymentStatus.PENDING
                and booking.created_at
                and booking.created_at < cutoff
            ):
                reason = "Pending payment for more than 14 days"

        if reason:
            create_auth_request_for_booking(
                db, booking,
                reason=reason,
                requested_by_id=system_user.id,
                auto_flagged=True,
            )
            flagged += 1

    if flagged:
        db.commit()
        logger.info(f"Auto-flagged {flagged} authorization requests")


def seed_demo_bookings(db):
    """Create one booking per BookingStatus so every UI tab has data to show."""
    from .models.booking import Booking, BookingStatus
    from .models.payment import Payment, PaymentStatus, ValidationStatus
    from .models.authorization import AuthorizationRequest, Appeal
    from .models.chase import ChaseRecord, ChaseStatus
    from .models.site import Site, Product
    from .models.user import User, UserRole
    from .models.agent_client import AgentClient
    import random, string

    if db.query(Booking).count() > 0:
        return  # already has data

    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    superuser = db.query(User).filter(User.role == UserRole.SUPERUSER).first()
    user = admin or superuser
    if not user:
        return

    site = db.query(Site).first()
    if not site:
        return
    gorilla = db.query(Product).filter(Product.name.ilike("%gorilla%")).first()
    monkey  = db.query(Product).filter(Product.name.ilike("%golden%")).first()
    canopy  = db.query(Product).filter(Product.name.ilike("%canopy%")).first()
    chimps  = db.query(Product).filter(Product.name.ilike("%chimp%")).first()
    products = [p for p in [gorilla, monkey, canopy, chimps] if p]
    if not products:
        return

    site2 = db.query(Site).filter(Site.name.ilike("%Nyungwe%")).first() or site

    # Get or create a demo trusted agent-client
    trusted_ac = db.query(AgentClient).filter_by(name="Demo Trusted Agency").first()
    if not trusted_ac:
        from .models.agent_client import AgentClientType
        trusted_ac = AgentClient(name="Demo Trusted Agency", type=AgentClientType.AGENT, is_trusted=True)
        db.add(trusted_ac)
        db.flush()

    untrusted_ac = db.query(AgentClient).filter_by(name="Demo Untrusted Client").first()
    if not untrusted_ac:
        from .models.agent_client import AgentClientType
        untrusted_ac = AgentClient(name="Demo Untrusted Client", type=AgentClientType.CLIENT, is_trusted=False)
        db.add(untrusted_ac)
        db.flush()

    def ref():
        return "DEM" + "".join(random.choices(string.digits, k=6))

    def make_payment(booking_id, prod, people, status, validation=ValidationStatus.PENDING,
                     deposit_paid=0, notes=None):
        unit = float(prod.unit_cost)
        total = unit * people
        dep = round(total * 0.3, 2)
        p = Payment(
            booking_id=booking_id,
            payment_status=status,
            validation_status=validation,
            validation_notes=notes,
            unit_cost=unit,
            units=people,
            amount=total,
            deposit_amount=dep,
            deposit_paid=deposit_paid,
            balance_due=max(total - deposit_paid, 0),
            deposit_due_date=datetime.utcnow() + timedelta(days=14),
            balance_due_date=datetime.utcnow() + timedelta(days=60),
        )
        db.add(p)

    from datetime import timedelta, date

    today = date.today()

    scenarios = [
        # (booking_name, status, product, site, people, payment_kwargs, ac, extra_fn)
        ("Smith Family Trek",        BookingStatus.PROVISIONAL,              gorilla or products[0], site,  2,  None, None, None),
        ("Johnson Group",            BookingStatus.REQUESTED,                monkey  or products[0], site,  4,  None, trusted_ac, None),
        ("Williams Expedition",      BookingStatus.VR,                       gorilla or products[0], site,  3,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.PENDING), trusted_ac, None),
        ("Brown Nature Walk",        BookingStatus.CONFIRMED,                canopy  or products[0], site2, 2,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.PENDING), untrusted_ac, None),
        ("Davis Gorilla Trek",       BookingStatus.AWAITING_AUTHORIZATION,   gorilla or products[0], site,  2,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.DO_NOT_PURCHASE), trusted_ac, None),
        ("Miller Golden Monkeys",    BookingStatus.AUTHORIZED,               monkey  or products[0], site,  5,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.DO_NOT_PURCHASE), trusted_ac, None),
        ("Wilson Chimps Trek",       BookingStatus.CHASE,                    chimps  or products[0], site2, 3,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.DO_NOT_PURCHASE), untrusted_ac, None),
        ("Moore Canopy Walk",        BookingStatus.RELEASED,                 canopy  or products[0], site2, 2,
            dict(status=PaymentStatus.CANCELLED, validation=ValidationStatus.DO_NOT_PURCHASE), untrusted_ac, None),
        ("Taylor Full Payment",      BookingStatus.SECURED_FULL,             gorilla or products[0], site,  4,
            dict(status=PaymentStatus.FULLY_PAID, validation=ValidationStatus.OK_TO_PURCHASE_FULL, deposit_paid=6000), trusted_ac, None),
        ("Anderson Deposit",         BookingStatus.SECURED_DEPOSIT,          gorilla or products[0], site,  2,
            dict(status=PaymentStatus.DEPOSIT_PAID, validation=ValidationStatus.OK_TO_PURCHASE_DEPOSIT, deposit_paid=900), trusted_ac, None),
        ("Thomas Auth Secured",      BookingStatus.SECURED_AUTHORIZATION,    gorilla or products[0], site,  2,
            dict(status=PaymentStatus.PENDING, validation=ValidationStatus.DO_NOT_PURCHASE), trusted_ac, None),
        ("Jackson Amendment",        BookingStatus.AMENDMENT_REQUESTED,      monkey  or products[0], site,  3,
            dict(status=PaymentStatus.DEPOSIT_PAID, validation=ValidationStatus.OK_TO_PURCHASE_DEPOSIT, deposit_paid=90), trusted_ac, None),
        ("White Cancellation",       BookingStatus.CANCELLATION_REQUESTED,   canopy  or products[0], site2, 2,
            dict(status=PaymentStatus.DEPOSIT_PAID, validation=ValidationStatus.OK_TO_PURCHASE_DEPOSIT, deposit_paid=36), untrusted_ac, None),
        ("Harris Cancelled",         BookingStatus.CANCELLED,                chimps  or products[0], site2, 1,
            dict(status=PaymentStatus.CANCELLED, validation=ValidationStatus.DO_NOT_PURCHASE), untrusted_ac, None),
        ("Martin Rejected",          BookingStatus.REJECTED,                 gorilla or products[0], site,  2,
            dict(status=PaymentStatus.CANCELLED, validation=ValidationStatus.DO_NOT_PURCHASE), untrusted_ac, None),
    ]

    for idx, (name, bstatus, prod, bsite, people, pay_kw, ac, extra_fn) in enumerate(scenarios):
        trek_date = today + timedelta(days=60 + idx * 7)
        booking = Booking(
            booking_name=name,
            booking_ref=ref(),
            product=prod.name if prod else "Unknown",
            product_id=prod.id if prod else None,
            site_id=bsite.id if bsite else None,
            people=people,
            number_of_permits=people,
            date=trek_date,
            trekking_date=trek_date,
            date_of_request=today,
            head_of_file=name.split()[0],
            agent_client=ac.name[:3].upper() if ac else "GEN",
            agent_client_id=ac.id if ac else None,
            booking_status=bstatus,
            user_id=user.id,
            created_at=datetime.utcnow() - timedelta(days=20 - idx),
        )
        db.add(booking)
        db.flush()

        if pay_kw:
            make_payment(booking.id, prod, people, **pay_kw)
            db.flush()

        # For CHASE status — add a chase record
        if bstatus == BookingStatus.CHASE:
            chase = ChaseRecord(
                booking_id=booking.id,
                chase_count=2,
                last_chase_at=datetime.utcnow() - timedelta(days=7),
                next_chase_at=datetime.utcnow() + timedelta(days=7),
                status=ChaseStatus.ACTIVE,
            )
            db.add(chase)

        # For AWAITING_AUTHORIZATION / AUTHORIZED / SECURED_AUTHORIZATION — add auth request
        if bstatus in (BookingStatus.AWAITING_AUTHORIZATION, BookingStatus.AUTHORIZED,
                       BookingStatus.SECURED_AUTHORIZATION):
            ar_status = "pending" if bstatus == BookingStatus.AWAITING_AUTHORIZATION else "authorized"
            ar = AuthorizationRequest(
                booking_id=booking.id,
                reason="Trusted agent — proof of incoming payment provided",
                status=ar_status,
                requested_by=user.id,
                auto_flagged=False,
                deadline=datetime.utcnow() + timedelta(days=7),
            )
            db.add(ar)

        # For MILLER (AUTHORIZED with declined appeal scenario) — add declined auth + appeal
        if name == "Miller Golden Monkeys":
            db.flush()
            ar = db.query(AuthorizationRequest).filter_by(booking_id=booking.id).first()
            if ar:
                ar.status = "declined"
                db.flush()
                appeal = Appeal(
                    authorization_request_id=ar.id,
                    appeal_notes="We have proof of wire transfer — please reconsider.",
                    status="pending",
                )
                db.add(appeal)

    db.commit()
    logger.info("Demo bookings seeded (one per status)")


def seed_initial_data(db):
    from .models.site import Site, Product
    if db.query(Site).count() > 0:
        return  # already seeded
    site1 = Site(name="Volcanoes National Park")
    site2 = Site(name="Nyungwe Forest National Park")
    db.add_all([site1, site2])
    db.flush()
    products = [
        # Volcanoes National Park
        Product(name="Mountain gorillas", unit_cost=1500, site_id=site1.id),
        Product(name="Golden Monkeys", unit_cost=100, site_id=site1.id),
        Product(name="Bisoke", unit_cost=75, site_id=site1.id),
        Product(name="Dian Fossey Tomb", unit_cost=75, site_id=site1.id),
        Product(name="Gahinga", unit_cost=75, site_id=site1.id),
        Product(name="Muhabura", unit_cost=75, site_id=site1.id),
        Product(name="Muhabura-Gahinga", unit_cost=75, site_id=site1.id),
        Product(name="Nature walk", unit_cost=50, site_id=site1.id),
        Product(name="Sabyinyo Volcano Climbing", unit_cost=75, site_id=site1.id),
        Product(name="Buhanga Eco-park", unit_cost=50, site_id=site1.id),
        Product(name="Buhanga Eco-park(1 day picnic including Camping)", unit_cost=50, site_id=site1.id),
        Product(name="Hiking on a chain of volcanoes", unit_cost=75, site_id=site1.id),
        # Nyungwe Forest National Park
        Product(name="Canopy Walk", unit_cost=60, site_id=site2.id),
        Product(name="Canopy Walk Exclusive", unit_cost=120, site_id=site2.id),
        Product(name="Chimps Trek", unit_cost=90, site_id=site2.id),
        Product(name="Chimps Trek Exclusive", unit_cost=180, site_id=site2.id),
        Product(name="Bird Walk - Nyungwe Forest", unit_cost=50, site_id=site2.id),
        Product(name="Waterfall- Kamiranzovu", unit_cost=50, site_id=site2.id),
        Product(name="Waterfall- Ndambarare", unit_cost=50, site_id=site2.id),
        Product(name="Colubus / Mangabey Monkey", unit_cost=50, site_id=site2.id),
        Product(name="Colubus / Mangabey Monkey Exclusive", unit_cost=100, site_id=site2.id),
        Product(name="Entry fee 1st Night", unit_cost=30, site_id=site2.id),
        Product(name="Entry fee Extra Night", unit_cost=20, site_id=site2.id),
        Product(name="Nature Trails (Nyungwe National Park)", unit_cost=50, site_id=site2.id),
        Product(name="Nature Walk 0-5km", unit_cost=40, site_id=site2.id),
    ]
    db.add_all(products)
    db.commit()

# Path to the log file written next to run.py (backend root)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCHEDULER_LOG = os.path.join(_BACKEND_DIR, "scheduler.log")


def _log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}\n"
    try:
        with open(_SCHEDULER_LOG, "a") as f:
            f.write(line)
    except Exception:
        pass
    logger.info(msg)


async def _scrape_all_batches():
    """Scrape 2 years of data in batches of 30 days, same logic as run_scrapers.py."""
    from async_panda_headless import scrape_slots
    from async_golden_monkey import scrape_golden_monkey_slots
    from datetime import timedelta

    total_days = 365 * 2
    batch_size = 30
    total_batches = (total_days + batch_size - 1) // batch_size  # 25 batches

    _log(f"Starting full 2-year scrape: {total_batches} batches of {batch_size} days")

    for batch in range(total_batches):
        start_offset = batch * batch_size
        _log(f"Batch {batch + 1}/{total_batches} (days {start_offset}–{start_offset + batch_size - 1})")
        try:
            await scrape_slots(start_offset=start_offset)
            await asyncio.sleep(30)
            await scrape_golden_monkey_slots(start_offset=start_offset)
            if batch < total_batches - 1:
                await asyncio.sleep(30)
        except Exception as e:
            _log(f"Batch {batch + 1} error: {e} — continuing")
            continue

    _log("Full 2-year scrape complete")


def _run_scraper_in_thread():
    """
    Run the full 2-year scrape in a fresh ProactorEventLoop.
    Required on Windows: uvicorn uses SelectorEventLoop which does not
    support subprocess creation (needed by Playwright).
    """
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_scrape_all_batches())
    finally:
        loop.close()


async def _scrape_task():
    """Background task: runs a full 2-year scrape continuously — as soon as one cycle
    finishes, the next begins immediately so all dates are always kept fresh."""
    _log("Background scrape task started")
    while True:
        _log("Scrape cycle starting...")
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _run_scraper_in_thread)
            _log("Scrape cycle completed — restarting immediately")
        except Exception as e:
            import traceback
            _log(f"Scrape cycle FAILED: {traceback.format_exc()}")
            # Brief pause on failure to avoid hammering the site on repeated errors
            await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _log("Lifespan startup - seeding database and launching scrape task")
    migrate_booking_status_enum()
    try:
        with SessionLocal() as db:
            seed_initial_data(db)
            backfill_missing_payments(db)
            migrate_users_role_enum(db)
            seed_superuser(db)
            seed_authorizer_user(db)
            seed_demo_bookings(db)
            auto_flag_authorization_requests(db)
    except Exception as exc:
        logger.error(f"Startup seeding error (non-fatal): {exc}")

    # Start background scheduler (chase, overdue, slot alerts, etc.)
    from .scheduler import create_scheduler
    scheduler = create_scheduler()
    scheduler.start()
    _log("Background scheduler started")

    task = asyncio.create_task(_scrape_task())
    _log("Scrape task created")

    yield

    _log("Lifespan shutdown - cancelling scrape task and stopping scheduler")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    scheduler.shutdown(wait=False)
    _log("Scheduler stopped")


app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Add routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(finance.router, prefix="/api/finance", tags=["finance"])
app.include_router(passport.router, prefix="/api/passport", tags=["passport"])
app.include_router(voucher.router, prefix="/api/voucher", tags=["voucher"])
app.include_router(authorization.router, prefix="/api/authorization", tags=["authorization"])


@app.get("/")
async def root():
    return {"message": "API is running"}
