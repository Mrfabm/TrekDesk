# IMAi Database Documentation

## Overview

| Property | Value |
|----------|-------|
| Engine | PostgreSQL |
| Default DB | `booking_db` |
| Port | `5432` |
| ORM | SQLAlchemy (declarative base) |
| Migrations | Alembic (`backend/alembic.ini`) |
| Connection config | `backend/.env` → `DATABASE_URL` |

Tables are defined as SQLAlchemy models in `backend/app/models/`.
On startup, `Base.metadata.create_all()` creates any missing tables and `seed_initial_data()` seeds Sites + Products if empty.

---

## Tables

### `users`
Accounts for all system users.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, indexed |
| `email` | String | unique, indexed |
| `username` | String | unique, indexed |
| `hashed_password` | String | — |
| `role` | Enum | `user` · `admin` · `finance_admin` · `superuser` |
| `is_active` | Boolean | default `true` |

**Relationships:** `bookings`, `notifications`, `activity_logs`, `passport_data`, `validated_payments`

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
Core booking record. Created either manually (admin dashboard) or via voucher extraction.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK |
| `booking_name` | String | customer/group name |
| `booking_ref` | String | unique — set by voucher extraction |
| `date` | Date | trekking date |
| `date_of_request` | Date | voucher request date |
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

**Enums:**

| Enum | Values |
|------|--------|
| `BookingStatus` | `provisional` → `requested` → `validation_request` → `confirmed` / `rejected` / `amended` |
| `PaymentStatus` | `pending` · `deposit_paid` · `partial` · `fully_paid` · `cancelled` · `overdue` |
| `ValidationStatus` | `pending` · `ok_to_purchase_full` · `ok_to_purchase_deposit` · `do_not_purchase` |

**Booking lifecycle:**
```
[Admin creates]        provisional
[User requests]     →  requested
[Admin → Finance]   →  validation_request
[Finance validates] →  confirmed  (+ validation_status set)
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
| `booking_id` | Integer | FK → `bookings.id` (nullable — links passport to specific booking) |

> `booking_id` is the key field: passport records are scoped to a booking so the admin drawer shows only the people for that specific trip.

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
Gorilla permit availability scraped from the booking portal.

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer | PK |
| `date` | String | format `DD/MM/YYYY` |
| `slots` | String | number or `"Sold Out"` |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto-update |

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
users ──────────────────────────────────────────┐
  │                                             │
  │ 1:N          1:N          1:N               │
  ├──► bookings  notifications  activity_logs   │
  │       │                                     │
  │       │ 1:1                                 │
  │       └──► payments                         │
  │       │                                     │
  │       │ 1:N (booking_id)                    │
  │       └──► passport_data ◄──────────────────┘
  │                             (also user_id)
  │
sites ──► products ──► bookings (via product_id + site_id)

available_slots        (standalone, no FK)
golden_monkey_slots    (standalone, no FK)
scrape_status          (standalone, no FK)
```

---

## Migrations

Alembic is configured and manages schema evolution.

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

> **Note:** `booking_id` on `passport_data` was added manually via `ALTER TABLE` (2026-03-04). A proper Alembic migration for it is still needed — see below.

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

## Migrating to a New Server

### 1. On the new server — create the database

```bash
psql -U postgres -c "CREATE DATABASE booking_db;"
```

### 2. Update the connection string

`backend/.env`:
```
DATABASE_URL=postgresql://postgres:<password>@<new-host>:5432/booking_db
```

### 3. Create all tables via Alembic

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 4. Transfer all data from the old server

```bash
# On OLD server — dump data only (schema already created by Alembic)
pg_dump -U postgres -h old-host --data-only --no-owner \
  --exclude-table=alembic_version booking_db > data.sql

# On NEW server — restore
psql -U postgres -h new-host -d booking_db < data.sql
```

Or full dump (schema + data, skip Alembic step):
```bash
pg_dump -U postgres -h old-host booking_db > full_backup.sql
psql -U postgres -h new-host -d booking_db < full_backup.sql
```

### 5. Start the app

```bash
cd backend
venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Sites + Products are seeded automatically on first startup if the tables are empty.

---

## Missing Migration (Action Required)

The `booking_id` column on `passport_data` was added manually and is not tracked by Alembic.
Run this before deploying to a new environment:

```bash
cd backend
alembic revision --autogenerate -m "add_booking_id_to_passport_data"
alembic upgrade head
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/models/user.py` | User + UserRole enum |
| `backend/app/models/booking.py` | Booking + all booking enums + `update_from_voucher()` |
| `backend/app/models/payment.py` | Payment + PaymentStatus + ValidationStatus enums |
| `backend/app/models/passport_data.py` | PassportData |
| `backend/app/models/site.py` | Site + Product |
| `backend/app/models/notification.py` | Notification + enums |
| `backend/app/models/activity_log.py` | ActivityLog |
| `backend/app/models/available_slots.py` | AvailableSlot |
| `backend/app/models/golden_monkey_slots.py` | GoldenMonkeySlot |
| `backend/app/database.py` | Engine + session factory + Base |
| `backend/app/main.py` | `create_all()` + `seed_initial_data()` on startup |
| `backend/alembic.ini` | Alembic configuration |
| `backend/migrations/env.py` | Alembic environment (imports Base) |
| `backend/migrations/versions/` | Individual migration files |
| `backend/.env` | `DATABASE_URL` and secrets |
