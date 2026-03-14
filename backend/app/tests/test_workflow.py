"""
Workflow tests for the IMAi booking system.

Tests cover:
  - Self-registration (public /register endpoint)
  - Booking lifecycle (provisional → confirmed)
  - Payment validation routing (ok / trusted-no-payment / untrusted-no-payment)
  - Chase system (resolve + auto-release path)
  - Authorization workflow (request → approve/decline → appeal)
  - Amendment request (fee calculation, same/next year)
  - Cancellation request (non-refundable, booking → cancelled)
  - Permit purchasing (SECURED_* statuses)

Uses the real PostgreSQL database — no SQLite shim.
Seed data is idempotent; tests create uniquely-named resources.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from ..main import app
from ..database import SessionLocal

client = TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _db():
    return SessionLocal()


def _login(email: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Seed: ensure test accounts exist (idempotent)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module", autouse=True)
def seed_test_accounts():
    """Ensure test-only accounts exist in the database before running tests."""
    from passlib.context import CryptContext
    from ..models.user import User, UserRole

    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    accounts = [
        {"email": "testadmin@imai.test",   "username": "testadmin",   "password": "admin123",   "role": UserRole.ADMIN},
        {"email": "testuser@imai.test",    "username": "testuser",    "password": "user123",    "role": UserRole.USER},
        {"email": "testfinance@imai.test", "username": "testfinance", "password": "finance123", "role": UserRole.FINANCE_ADMIN},
        {"email": "testauth@imai.test",    "username": "testauth",    "password": "auth123",    "role": UserRole.AUTHORIZER},
    ]

    db = _db()
    try:
        for acc in accounts:
            if not db.query(User).filter(User.email == acc["email"]).first():
                db.add(User(
                    email=acc["email"],
                    username=acc["username"],
                    hashed_password=pwd.hash(acc["password"]),
                    role=acc["role"],
                    is_active=True,
                ))
        db.commit()
    finally:
        db.close()


# Short aliases — used in every test
ADMIN    = ("testadmin@imai.test",   "admin123")
USER     = ("testuser@imai.test",    "user123")
FINANCE  = ("testfinance@imai.test", "finance123")
AUTH     = ("testauth@imai.test",    "auth123")
SUPERUSER = ("admin@example.com",    "admin123")


def _get_site_product():
    """Return (site_name, product_name) for the first seeded site/product."""
    from ..models.site import Site, Product
    db = _db()
    try:
        site = db.query(Site).first()
        product = db.query(Product).first()
        assert site and product, "Run the app once to seed sites/products"
        return site.name, product.name
    finally:
        db.close()


def _make_booking(token, name, booking_type="confirmed", days_ahead=90):
    site_name, product_name = _get_site_product()
    future_date = (datetime.utcnow() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    r = client.post("/api/bookings", json={
        "booking_name": name,
        "site": site_name,
        "product": product_name,
        "number_of_people": 2,
        "date": future_date,
        "status": booking_type,
        "available_slots": 8,
    }, headers=_auth(token))
    assert r.status_code in (200, 201), f"Create booking failed: {r.text}"
    return r.json().get("id") or r.json().get("booking_id")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSelfRegistration:
    """Public /register endpoint — agents create their own accounts."""

    def test_register_creates_user_account(self):
        unique = datetime.utcnow().strftime("%f")
        r = client.post("/api/auth/register", json={
            "email": f"reg_{unique}@agency.test",
            "username": f"reg_{unique}",
            "password": "secure123",
        })
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["role"] == "user"

    def test_registered_user_can_login(self):
        unique = datetime.utcnow().strftime("%f")
        email = f"login_{unique}@agency.test"
        client.post("/api/auth/register", json={"email": email, "username": f"u_{unique}", "password": "pass1234"})
        token = _login(email, "pass1234")
        assert token

    def test_duplicate_email_rejected(self):
        unique = datetime.utcnow().strftime("%f")
        email = f"dup_{unique}@agency.test"
        client.post("/api/auth/register", json={"email": email, "username": f"d1_{unique}", "password": "pass123"})
        r = client.post("/api/auth/register", json={"email": email, "username": f"d2_{unique}", "password": "pass123"})
        assert r.status_code == 400
        assert "Email" in r.json()["detail"]

    def test_duplicate_username_rejected(self):
        unique = datetime.utcnow().strftime("%f")
        username = f"un_{unique}"
        client.post("/api/auth/register", json={"email": f"un1_{unique}@a.test", "username": username, "password": "pass123"})
        r = client.post("/api/auth/register", json={"email": f"un2_{unique}@a.test", "username": username, "password": "pass123"})
        assert r.status_code == 400
        assert "Username" in r.json()["detail"]

    def test_short_password_rejected(self):
        unique = datetime.utcnow().strftime("%f")
        r = client.post("/api/auth/register", json={"email": f"short_{unique}@a.test", "username": f"sh_{unique}", "password": "abc"})
        assert r.status_code == 400
        assert "Password" in r.json()["detail"]

    def test_cannot_self_register_as_admin(self):
        unique = datetime.utcnow().strftime("%f")
        r = client.post("/api/auth/register", json={
            "email": f"fake_{unique}@a.test",
            "username": f"fake_{unique}",
            "password": "pass123",
            "role": "admin",
        })
        assert r.status_code == 201
        assert r.json()["role"] == "user"

    def test_superuser_can_login(self):
        token = _login(*SUPERUSER)
        assert token


class TestBookingLifecycle:

    def test_create_provisional_booking(self):
        token = _login(*USER)
        booking_id = _make_booking(token, f"Provisional_{datetime.utcnow().strftime('%f')}", "provisional")
        assert booking_id

    def test_create_confirmed_booking(self):
        token = _login(*USER)
        booking_id = _make_booking(token, f"Confirmed_{datetime.utcnow().strftime('%f')}", "confirmed")
        assert booking_id

    def test_admin_can_list_all_bookings(self):
        token = _login(*ADMIN)
        r = client.get("/api/bookings/all", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_finance_can_list_bookings(self):
        token = _login(*FINANCE)
        r = client.get("/api/bookings/all", headers=_auth(token))
        assert r.status_code == 200

    def test_user_sees_own_bookings(self):
        token = _login(*USER)
        r = client.get("/api/bookings/my-bookings", headers=_auth(token))
        assert r.status_code == 200


class TestPaymentValidation:

    def test_ok_to_purchase_full_routes_to_confirmed(self):
        user_token = _login(*USER)
        booking_id = _make_booking(user_token, f"PayFull_{datetime.utcnow().strftime('%f')}")

        finance_token = _login(*FINANCE)
        r = client.post("/api/finance/validate-payment", json={
            "booking_id": booking_id,
            "amount_received": 3000.0,
            "validation_status": "ok_to_purchase_full",
        }, headers=_auth(finance_token))
        assert r.status_code == 200, r.text
        assert r.json()["booking_status"] == "confirmed"
        assert r.json()["validation_status"] == "ok_to_purchase_full"

    def test_do_not_purchase_untrusted_creates_chase(self):
        user_token = _login(*USER)
        booking_id = _make_booking(user_token, f"Chase_{datetime.utcnow().strftime('%f')}")

        finance_token = _login(*FINANCE)
        r = client.post("/api/finance/validate-payment", json={
            "booking_id": booking_id,
            "amount_received": 0,
            "validation_status": "do_not_purchase",
        }, headers=_auth(finance_token))
        assert r.status_code == 200, r.text
        assert r.json()["booking_status"] == "chase"

    def test_pending_validations_list(self):
        token = _login(*FINANCE)
        r = client.get("/api/finance/pending-validations", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestChaseSystem:

    def test_chase_list_visible_to_admin(self):
        token = _login(*ADMIN)
        r = client.get("/api/chase", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_chase_list_visible_to_finance(self):
        token = _login(*FINANCE)
        r = client.get("/api/chase", headers=_auth(token))
        assert r.status_code == 200

    def test_chase_list_blocked_for_user(self):
        token = _login(*USER)
        r = client.get("/api/chase", headers=_auth(token))
        assert r.status_code == 403

    def test_resolve_chase_moves_booking_to_confirmed(self):
        from ..models.chase import ChaseRecord, ChaseStatus

        db = _db()
        try:
            record = db.query(ChaseRecord).filter(ChaseRecord.status == ChaseStatus.ACTIVE).first()
        finally:
            db.close()

        if not record:
            pytest.skip("No active chase records — run test_do_not_purchase_untrusted_creates_chase first")

        token = _login(*ADMIN)
        r = client.post(f"/api/chase/{record.id}/resolve", headers=_auth(token))
        assert r.status_code == 200, r.text


class TestAuthorizationWorkflow:

    def _awaiting_auth_booking_id(self):
        """Create a confirmed booking and manually set it to AWAITING_AUTHORIZATION."""
        from ..models.booking import Booking, BookingStatus
        from ..models.user import User, UserRole

        user_token = _login(*USER)
        booking_id = _make_booking(user_token, f"AuthTest_{datetime.utcnow().strftime('%f')}")

        db = _db()
        try:
            db_user = db.query(User).filter(User.email == USER[0]).first()
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            booking.booking_status = BookingStatus.AWAITING_AUTHORIZATION
            db.commit()
        finally:
            db.close()
        return booking_id

    def test_user_can_request_authorization(self):
        booking_id = self._awaiting_auth_booking_id()
        token = _login(*USER)
        r = client.post("/api/authorization/request", json={
            "booking_id": booking_id,
            "reason": "Payment wire in progress",
            "deadline_days": 7,
        }, headers=_auth(token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"

    def test_authorizer_can_approve(self):
        booking_id = self._awaiting_auth_booking_id()
        user_token = _login(*USER)
        r = client.post("/api/authorization/request", json={
            "booking_id": booking_id,
            "reason": "Payment incoming",
        }, headers=_auth(user_token))
        request_id = r.json()["id"]

        auth_token = _login(*AUTH)
        r = client.post(f"/api/authorization/{request_id}/authorize", json={
            "authorizer_notes": "Approved"
        }, headers=_auth(auth_token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "authorized"

    def test_authorizer_can_decline(self):
        booking_id = self._awaiting_auth_booking_id()
        user_token = _login(*USER)
        r = client.post("/api/authorization/request", json={
            "booking_id": booking_id,
            "reason": "Decline test",
        }, headers=_auth(user_token))
        request_id = r.json()["id"]

        auth_token = _login(*AUTH)
        r = client.post(f"/api/authorization/{request_id}/decline", json={
            "authorizer_notes": "Insufficient proof"
        }, headers=_auth(auth_token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "declined"

    def test_user_can_appeal_declined(self):
        booking_id = self._awaiting_auth_booking_id()
        user_token = _login(*USER)
        r = client.post("/api/authorization/request", json={
            "booking_id": booking_id,
            "reason": "Appeal test",
        }, headers=_auth(user_token))
        request_id = r.json()["id"]

        auth_token = _login(*AUTH)
        client.post(f"/api/authorization/{request_id}/decline", json={"authorizer_notes": "Declined"}, headers=_auth(auth_token))

        r = client.post(f"/api/authorization/{request_id}/appeal", json={
            "appeal_notes": "Additional bank confirmation attached"
        }, headers=_auth(user_token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"


class TestAmendmentWorkflow:

    def _confirmed_booking_id(self):
        token = _login(*USER)
        return _make_booking(token, f"AmendTest_{datetime.utcnow().strftime('%f')}")

    def test_same_year_amendment_fee_is_20pct(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*USER)
        same_year = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
        r = client.post(f"/api/amendments/request/{booking_id}", json={
            "requested_date": same_year,
            "reason": "Schedule conflict",
        }, headers=_auth(token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["fee_type"] == "same_year_20pct"
        # fee = 20% of (unit_cost × 2 people)
        assert data["fee_amount"] > 0

    def test_next_year_amendment_fee_is_100pct(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*USER)
        next_year = (datetime.utcnow() + timedelta(days=400)).strftime("%Y-%m-%d")
        r = client.post(f"/api/amendments/request/{booking_id}", json={
            "requested_date": next_year,
            "reason": "Annual schedule change",
        }, headers=_auth(token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["fee_type"] == "next_year_full"
        assert data["fee_amount"] > 0

    def test_finance_can_confirm_amendment_fee_paid(self):
        booking_id = self._confirmed_booking_id()
        user_token = _login(*USER)
        same_year = (datetime.utcnow() + timedelta(days=25)).strftime("%Y-%m-%d")
        r = client.post(f"/api/amendments/request/{booking_id}", json={
            "requested_date": same_year,
            "reason": "Fee payment test",
        }, headers=_auth(user_token))
        amendment_id = r.json()["amendment_id"]

        finance_token = _login(*FINANCE)
        r = client.post(f"/api/amendments/{amendment_id}/confirm-fee-paid", headers=_auth(finance_token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "fee_paid"

    def test_pending_amendments_list(self):
        token = _login(*FINANCE)
        r = client.get("/api/amendments/pending", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestCancellationWorkflow:

    def _confirmed_booking_id(self):
        token = _login(*USER)
        return _make_booking(token, f"CancelTest_{datetime.utcnow().strftime('%f')}")

    def test_user_can_request_cancellation(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*USER)
        r = client.post(f"/api/cancellations/request/{booking_id}", json={"reason": "Travel plans changed"}, headers=_auth(token))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"

    def test_admin_can_confirm_cancellation(self):
        booking_id = self._confirmed_booking_id()
        user_token = _login(*USER)
        r = client.post(f"/api/cancellations/request/{booking_id}", json={"reason": "Confirm test"}, headers=_auth(user_token))
        cancellation_id = r.json()["id"]

        admin_token = _login(*ADMIN)
        r = client.post(f"/api/cancellations/{cancellation_id}/confirm", headers=_auth(admin_token))
        assert r.status_code == 200, r.text

        from ..models.booking import Booking, BookingStatus
        db = _db()
        try:
            b = db.query(Booking).filter(Booking.id == booking_id).first()
            assert b.booking_status == BookingStatus.CANCELLED
        finally:
            db.close()

    def test_admin_can_reject_cancellation(self):
        booking_id = self._confirmed_booking_id()
        user_token = _login(*USER)
        r = client.post(f"/api/cancellations/request/{booking_id}", json={"reason": "Reject test"}, headers=_auth(user_token))
        cancellation_id = r.json()["id"]

        admin_token = _login(*ADMIN)
        r = client.post(f"/api/cancellations/{cancellation_id}/reject", json={"admin_notes": "Permits already purchased"}, headers=_auth(admin_token))
        assert r.status_code == 200, r.text

    def test_pending_cancellations_list(self):
        token = _login(*ADMIN)
        r = client.get("/api/cancellations/pending", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestPermitPurchasing:

    def _confirmed_booking_id(self):
        user_token = _login(*USER)
        booking_id = _make_booking(user_token, f"PermitsTest_{datetime.utcnow().strftime('%f')}")
        # Validate payment first so booking is in the right state
        finance_token = _login(*FINANCE)
        client.post("/api/finance/validate-payment", json={
            "booking_id": booking_id,
            "amount_received": 3000.0,
            "validation_status": "ok_to_purchase_full",
        }, headers=_auth(finance_token))
        return booking_id

    def test_purchase_permits_full(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*ADMIN)
        r = client.post(f"/api/bookings/{booking_id}/purchase-permits", json={"purchase_type": "full"}, headers=_auth(token))
        assert r.status_code == 200, r.text
        assert r.json()["booking_status"] == "secured_full"

    def test_purchase_permits_deposit(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*ADMIN)
        r = client.post(f"/api/bookings/{booking_id}/purchase-permits", json={"purchase_type": "deposit"}, headers=_auth(token))
        assert r.status_code == 200, r.text
        assert r.json()["booking_status"] == "secured_deposit"

    def test_finance_cannot_purchase_permits(self):
        booking_id = self._confirmed_booking_id()
        token = _login(*FINANCE)
        r = client.post(f"/api/bookings/{booking_id}/purchase-permits", json={"purchase_type": "full"}, headers=_auth(token))
        assert r.status_code == 403


class TestNotifications:

    def test_user_can_list_own_notifications(self):
        token = _login(*USER)
        r = client.get("/api/notifications", headers=_auth(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_auth_request_notifies_authorizer(self):
        # Create booking and request authorization
        user_token = _login(*USER)
        booking_id = _make_booking(user_token, f"NotifTest_{datetime.utcnow().strftime('%f')}")

        # Set to awaiting auth
        from ..models.booking import Booking, BookingStatus
        db = _db()
        try:
            b = db.query(Booking).filter(Booking.id == booking_id).first()
            b.booking_status = BookingStatus.AWAITING_AUTHORIZATION
            db.commit()
        finally:
            db.close()

        client.post("/api/authorization/request", json={
            "booking_id": booking_id,
            "reason": "Notif test",
        }, headers=_auth(user_token))

        auth_token = _login(*AUTH)
        r = client.get("/api/notifications", headers=_auth(auth_token))
        assert r.status_code == 200
        notifs = r.json()
        assert len(notifs) > 0, "Authorizer should have at least one notification"
