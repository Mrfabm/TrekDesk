# TrekDesk Database Documentation

## Overview

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 16 |
| Default DB | `booking_db` |
| Port | `5432` |
| ORM | SQLAlchemy (declarative base) |
| Migrations | Alembic (`backend/alembic.ini`) |
| Connection config | `backend/.env` → `DATABASE_URL` |
| Docker container | `imai-postgres` (postgres:16) |

Tables are defined as SQLAlchemy models in `backend/app/models/`.
On startup, `Base.metadata.create_all()` creates any missing tables and `seed_initial_data()` seeds Sites + Products if empty.

---

## Tables (19 total)

### `users`
Accounts for all system users.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `email` | String | unique, indexed |
| `username` | String | unique, indexed |
| `hashed_password` | String | — |
| `role` | Enum | `user` · `admin` · `finance_admin` · `superuser` · `authorizer` |
| `is_active` | Boolean | default `true` |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

**Relationships:** `bookings`, `notifications`, `activity_logs`, `passport_data`, `validated_payments`

**Seeded users on startup:**

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | superuser |
| authorizer@test.com | auth123 | authorizer |

---

### `sites`
Physical permit sites. Seeded on startup.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `name` | String | unique |

**Seeded values:** Volcanoes National Park · Nyungwe Forest National Park

**Relationships:** `products` (1:N)

---

### `products`
Permit types sold at each site. Seeded on startup.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `name` | String | — |
| `unit_cost` | Numeric(10,2) | cost per person |
| `site_id` | Integer | FK → `sites.id` |

**Examples:** Mountain Gorillas ($1,500) · Golden Monkeys ($100) · Canopy Walk · Bisoke · Chimps Trek · etc.

---

### `bookings`
Core booking record. Created manually (admin dashboard) or via voucher extraction.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `booking_name` | String | customer/group name |
| `booking_ref` | String | unique — set by voucher extraction |
| `invoice_no` | String | — |
| `date_of_request` | Date | voucher request date |
| `trekking_date` | Date | trek date from voucher |
| `date` | Date | alias of `trekking_date` |
| `head_of_file` | String | from voucher |
| `agent_client` | String | first 3 chars of `booking_ref` |
| `product` | String | product name string (denormalised) |
| `people` | Integer | number of people |
| `number_of_permits` | Integer | same as `people` |
| `total_amount` | Float | calculated from product × people |
| `paid_amount` | Float | default `0.0` |
| `booking_status` | Enum | see below |
| `payment_status` | Enum | see below |
| `validation_status` | Enum | see below |
| `notes` | String | optional notes |
| `created_at` | DateTime | auto |
| `user_id` | Integer | FK → `users.id` |
| `site_id` | Integer | FK → `sites.id` |
| `product_id` | Integer | FK → `products.id` |
| `agent_client_id` | Integer | FK → `agent_clients.id` (nullable) |

**BookingStatus enum:**

| Value | Meaning |
|-------|---------|
| `provisional` | Admin created, not yet requested |
| `validation_request` | Sent to Finance for validation |
| `confirmed` | Finance validated, awaiting payment |
| `awaiting_authorization` | Trusted agent — auth request submitted |
| `authorized` | Auth approved — ready for permit purchase |
| `chase` | Untrusted agent — 5 weekly chase alerts sent |
| `released` | Auto-released after 5 failed chases |
| `secured_full` | Permits purchased, full payment received |
| `secured_deposit` | Permits purchased, deposit only (balance due later) |
| `secured_authorization` | Permits purchased under authorization |
| `amendment_requested` | Date change request pending |
| `cancellation_requested` | Cancellation request pending |
| `cancelled` | Booking cancelled |
| `rejected` | Booking rejected by finance |

**PaymentStatus enum:** `pending` · `deposit_paid` · `partial` · `fully_paid` · `cancelled` · `overdue`

**ValidationStatus enum:** `pending` · `ok_to_purchase_full` · `ok_to_purchase_deposit` · `do_not_purchase`

**Booking lifecycle:**
```
[Admin creates]           provisional
[Admin → Finance]      →  validation_request
[Finance validates]    →  confirmed  (validation_status set)
                          │
                    ┌─────┴──────────────────────────┐
              trusted agent                    untrusted agent
                    │                                 │
         awaiting_authorization                    chase
                    │                        (5 weekly alerts)
              authorized                            │
                    │                           released (auto)
                    └──────────┬─────────────────────┘
                               │ Admin purchases permit
                    ┌──────────┴──────────────┐
              secured_full         secured_deposit / secured_authorization
```

---

### `payments`
1:1 with bookings. Created when admin sends booking to Finance.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `booking_id` | Integer | FK → `bookings.id` |
| `amount` | Numeric(10,2) | total |
| `deposit_amount` | Numeric(10,2) | required deposit |
| `deposit_paid` | Numeric(10,2) | default `0` |
| `balance_due` | Numeric(10,2) | remaining |
| `unit_cost` | Numeric(10,2) | cost per person |
| `units` | Integer | number of people |
| `payment_status` | Enum | same as booking `PaymentStatus` |
| `validation_status` | Enum | same as booking `ValidationStatus` |
| `validation_notes` | String | finance notes |
| `deposit_due_date` | DateTime | — |
| `balance_due_date` | DateTime | — |
| `validated_by` | Integer | FK → `users.id` (nullable) |
| `validated_at` | DateTime | — |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

**Relationships:** `booking`, `payment_due_audits`

---

### `agent_clients`
Agent and client profiles. Controls trust level, payment terms, and rolling deposit accounts.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `name` | String | indexed |
| `type` | Enum | `agent` · `client` |
| `is_trusted` | Boolean | default `false` — trusted agents skip chase, go to authorization |
| `has_rolling_deposit` | Boolean | default `false` |
| `email` | String | nullable |
| `phone` | String | nullable |
| `notes` | String | nullable |
| `payment_terms_deposit_days` | Integer | days until deposit due (default 7) |
| `payment_terms_balance_days` | Integer | days until balance due (default 45) |
| `payment_terms_anchor` | Enum | `from_request` · `from_authorization` · `before_trek` |
| `rolling_deposit_limit` | Float | agreed pot size (e.g. $10,000) |
| `rolling_deposit_balance` | Float | currently available balance |
| `created_at` | DateTime | auto |

**Relationships:** `bookings` (1:N), `rolling_deposit_transactions` (1:N)

---

### `rolling_deposit_transactions`
Ledger entries for each agent's rolling deposit account.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `agent_client_id` | Integer | FK → `agent_clients.id` |
| `booking_id` | Integer | FK → `bookings.id` (nullable) |
| `type` | Enum | `top_up` · `applied` · `returned` · `adjustment` |
| `amount` | Float | always positive |
| `balance_after` | Float | running balance snapshot after this transaction |
| `notes` | Text | nullable |
| `created_by` | Integer | FK → `users.id` (nullable) |
| `created_at` | DateTime | auto |

**Transaction types:**
- `top_up` — Agent sends funds to replenish pot
- `applied` — Funds used to cover permit purchase (debit)
- `returned` — Funds restored after agent pays invoice (credit)
- `adjustment` — Manual correction by finance

---

### `payment_due_audits`
History of every manual change to deposit or balance due dates.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `payment_id` | Integer | FK → `payments.id` |
| `field_changed` | String | `deposit_due_date` or `balance_due_date` |
| `old_value` | DateTime | previous date |
| `new_value` | DateTime | new date |
| `reason` | Text | required explanation |
| `changed_by` | Integer | FK → `users.id` (nullable) |
| `changed_at` | DateTime | auto |

---

### `authorization_requests`
Raised by Finance for high-value or trusted-agent bookings requiring authorizer sign-off.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `booking_id` | Integer | FK → `bookings.id` |
| `reason` | Text | why authorization is needed |
| `proof_documents` | String | comma-separated filenames/URLs |
| `deadline` | DateTime | when decision is needed by |
| `status` | String | `pending` · `authorized` · `declined` |
| `requested_by` | Integer | FK → `users.id` (finance admin) |
| `authorizer_id` | Integer | FK → `users.id` (nullable — assigned authorizer) |
| `authorizer_notes` | Text | decision notes |
| `auto_flagged` | Boolean | `true` if flagged automatically on startup |
| `created_at` | DateTime | auto |

**Relationships:** `booking`, `requester`, `authorizer_user`, `appeal`

---

### `appeals`
Filed by Finance when an authorization request is declined.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `authorization_request_id` | Integer | FK → `authorization_requests.id` |
| `appeal_notes` | Text | grounds for appeal |
| `appeal_documents` | String | supporting documents |
| `status` | String | `pending` · `approved` · `rejected` |
| `reviewed_by` | Integer | FK → `users.id` (nullable) |
| `created_at` | DateTime | auto |

---

### `chase_records`
Tracks automated weekly chase follow-ups for untrusted agents with no payment.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `booking_id` | Integer | FK → `bookings.id`, unique |
| `chase_count` | Integer | 0–5 (auto-released at 5) |
| `last_chase_at` | DateTime | nullable |
| `next_chase_at` | DateTime | scheduler fires when this < now |
| `status` | Enum | `active` · `resolved` · `released` |
| `created_at` | DateTime | auto |

---

### `amendment_requests`
Date change requests on confirmed or secured bookings.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `booking_id` | Integer | FK → `bookings.id` |
| `original_date` | Date | — |
| `requested_date` | Date | new requested date |
| `reason` | String | nullable |
| `fee_type` | Enum | `same_year_20pct` · `next_year_full` |
| `fee_amount` | Numeric(10,2) | calculated amendment fee |
| `status` | Enum | `pending` · `fee_paid` · `confirmed` · `rejected` |
| `requested_by` | Integer | FK → `users.id` |
| `fee_confirmed_by` | Integer | FK → `users.id` (nullable) |
| `confirmed_by` | Integer | FK → `users.id` (nullable) |
| `admin_notes` | String | nullable |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

**Fee rules:**
- Same calendar year → 20% of full permit cost
- Different year → 100% (new permit must be purchased)

---

### `cancellation_requests`
Cancellation requests raised by users or admin.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `booking_id` | Integer | FK → `bookings.id` |
| `reason` | String | nullable |
| `status` | Enum | `pending` · `confirmed` · `rejected` |
| `requested_by` | Integer | FK → `users.id` |
| `confirmed_by` | Integer | FK → `users.id` (nullable) |
| `admin_notes` | String | e.g. "Non-refundable" |
| `created_at` | DateTime | auto |

---

### `passport_data`
Passport records extracted via GPT-4o Vision, linked to a specific booking.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `full_name` | String | — |
| `date_of_birth` | Date | — |
| `passport_number` | String | unique |
| `passport_expiry` | Date | — |
| `nationality` | String | nullable |
| `place_of_birth` | String | nullable |
| `gender` | String | nullable (`M`/`F`/`X`) |
| `document_file` | String | file path, nullable |
| `confidence_score` | Float | default `1.0` (AI confidence) |
| `source_file` | String | original upload path |
| `extraction_status` | String | `complete` · `incomplete` · `error` |
| `extraction_error` | Text | nullable |
| `created_at` | DateTime(tz) | auto |
| `updated_at` | DateTime(tz) | auto-update |
| `user_id` | Integer | FK → `users.id` |
| `booking_id` | Integer | FK → `bookings.id` (nullable) |

---

### `notifications`
Per-user notification inbox.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `user_id` | Integer | FK → `users.id` |
| `type` | Enum | `info` · `warning` · `error` · `success` · `urgent` |
| `priority` | Enum | `low` · `medium` · `high` · `urgent` |
| `status` | Enum | `unread` · `read` · `archived` |
| `title` | String | — |
| `message` | Text | — |
| `created_at` | DateTime(tz) | auto |
| `read_at` | DateTime(tz) | nullable |
| `requires_action` | Boolean | default `false` |
| `action_url` | String | nullable |

---

### `activity_logs`
Audit trail of all user actions.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `user_id` | Integer | FK → `users.id` |
| `action` | String | action type, indexed |
| `details` | JSON | action metadata |
| `ip_address` | String | nullable |
| `timestamp` | DateTime | auto |

---

### `available_slots`
Gorilla permit availability scraped from the booking portal (updated continuously).

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer | PK |
| `date` | String | format `DD/MM/YYYY` (varchar, not Date) |
| `slots` | String | number or `"Sold Out"` |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

> **Important:** `date` is stored as a varchar string in `DD/MM/YYYY` format, not a SQL Date. Always compare as string: `filter(AvailableSlot.date == date_str)`.

---

### `golden_monkey_slots`
Same structure as `available_slots` but for Golden Monkey permits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer | PK |
| `date` | String | format `DD/MM/YYYY` |
| `slots` | String | number or `"Sold Out"` |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

---

### `scrape_status`
Tracks the last web-scrape run result.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer | PK |
| `last_run` | DateTime | auto |
| `status` | String | `success` · `failed` |
| `message` | String | nullable |

---

## Entity Relationship Diagram

```
users ──────────────────────────────────────────────────────────┐
  │                                                             │
  │ 1:N            1:N             1:N                          │
  ├──► bookings   notifications   activity_logs                 │
  │       │                                                     │
  │       │ 1:1                                                 │
  │       ├──► payments ──► payment_due_audits                  │
  │       │                                                     │
  │       │ 1:N (booking_id)                                    │
  │       ├──► passport_data ◄──────────────────────────────────┘
  │       │                           (also user_id)
  │       │ 1:1
  │       ├──► chase_records
  │       │ 1:N
  │       ├──► amendment_requests
  │       │ 1:N
  │       ├──► cancellation_requests
  │       │ 1:1
  │       └──► authorization_requests ──► appeals
  │
sites ──► products ──► bookings (via product_id + site_id)

agent_clients ──► bookings (via agent_client_id)
agent_clients ──► rolling_deposit_transactions

available_slots        (standalone, no FK — varchar date)
golden_monkey_slots    (standalone, no FK — varchar date)
scrape_status          (standalone, no FK)
```

---

## Migrations

**Config:** `backend/alembic.ini`
**Migration files:** `backend/migrations/versions/`

### Migration history (in order)

| Revision | Description |
|----------|-------------|
| `0a23b177471f` | Create passport_data table |
| `64a6f093654a` | Add confidence_score to passport_data |
| `bdaa6addd59a` | Add extraction_status + extraction_error to passport_data |
| `c287a91ecc15` | Add notification_preferences table |
| `da1fe4e06565` | Add confidence_score column (duplicate — safe) |

> **Note:** Several newer tables (`agent_clients`, `authorization_requests`, `appeals`, `chase_records`, `amendment_requests`, `cancellation_requests`, `rolling_deposit_transactions`, `payment_due_audits`) were added via `Base.metadata.create_all()` at startup and do not yet have Alembic migration files. They are created automatically on first run.

### Common commands

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Check current state
alembic current

# View full history
alembic history

# Roll back one step
alembic downgrade -1

# Generate migration from model changes
alembic revision --autogenerate -m "describe_your_change"
```

---

## Migrating to a New Server / Cloud

### Option A — Fresh start (recommended for cloud deploy)

The app self-creates all tables and seeds required data on first startup. No manual SQL needed.

**Step 1.** Provision a PostgreSQL 16 database (Docker, AWS RDS, Supabase, Railway, Render, etc.)

**Step 2.** Update `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:<password>@<new-host>:5432/booking_db
```

**Step 3.** Start the app — tables + seed data are created automatically:
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

On startup the app will:
- Create all 19 tables
- Seed 2 Sites + 25 Products
- Create superuser `admin@example.com` / `admin123`
- Create authorizer `authorizer@test.com` / `auth123`

### Option B — Migrate existing data

Bring the current bookings, users, slots, etc. from the Docker container to the new server.

```bash
# 1. Dump from the local Docker container
docker exec imai-postgres pg_dump -U postgres booking_db > booking_db_backup.sql

# 2. Restore into the new server
psql <new-connection-string> < booking_db_backup.sql
```

Or for cloud providers that give you a connection string:
```bash
pg_restore --no-owner -d "postgresql://user:pass@host:5432/booking_db" booking_db_backup.sql
```

### Option C — Docker Compose (self-hosted cloud)

Create a `docker-compose.yml` at project root to run both app + database together:

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: booking_db
      POSTGRES_PASSWORD: yourpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:yourpassword@db:5432/booking_db
    ports:
      - "8000:8000"
    depends_on:
      - db

volumes:
  pgdata:
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/models/user.py` | User + UserRole enum |
| `backend/app/models/booking.py` | Booking + all booking enums + BookingStatus lifecycle |
| `backend/app/models/payment.py` | Payment + PaymentStatus + ValidationStatus enums |
| `backend/app/models/agent_client.py` | AgentClient + RollingDepositTransaction + PaymentDueAudit |
| `backend/app/models/authorization.py` | AuthorizationRequest + Appeal |
| `backend/app/models/chase.py` | ChaseRecord + ChaseStatus enum |
| `backend/app/models/amendment.py` | AmendmentRequest + fee type/status enums |
| `backend/app/models/cancellation.py` | CancellationRequest + status enum |
| `backend/app/models/passport_data.py` | PassportData |
| `backend/app/models/site.py` | Site + Product |
| `backend/app/models/notification.py` | Notification + enums |
| `backend/app/models/activity_log.py` | ActivityLog |
| `backend/app/models/available_slots.py` | AvailableSlot (varchar date) |
| `backend/app/models/golden_monkey_slots.py` | GoldenMonkeySlot (varchar date) |
| `backend/app/routes/finance_ar.py` | AR/AP/Rolling Deposit API endpoints |
| `backend/app/services/rolling_deposit.py` | Rolling deposit business logic |
| `backend/app/database.py` | Engine + session factory + Base |
| `backend/app/main.py` | `create_all()` + all startup seeders + enum migrations |
| `backend/seed_scenarios.py` | Script to seed 29 demo scenarios covering all booking states |
| `backend/alembic.ini` | Alembic configuration |
| `backend/migrations/versions/` | Individual migration files |
| `backend/.env` | `DATABASE_URL` and secrets (never commit) |
