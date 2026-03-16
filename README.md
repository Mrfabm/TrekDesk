# TrekDesk

A full-stack booking management system for gorilla and golden monkey trekking operations in Rwanda. Built to handle the complete booking lifecycle — from slot availability scraping and passport OCR to finance tracking, authorization workflows, and voucher generation.

---

## Features

- **Booking Management** — Create, track, and manage trekking bookings across a full status lifecycle (provisional → secured/cancelled)
- **Slot Availability** — Continuous background scraping of gorilla and golden monkey permit availability
- **Finance Dashboard** — Payment validation, chase management, amendment fees, overdue tracking
- **AR / AP Finance** — Accounts Receivable (agent payments due), Accounts Payable (permits purchased), with full filter suite
- **Rolling Deposits** — Per-agent deposit accounts with top-up, applied, and return transaction ledger
- **Authorization Workflow** — High-value bookings requiring authorizer sign-off; auto-flagging on startup; appeal mechanism
- **Agent & Client Management** — Trusted flags, rolling deposit config, payment terms per agent
- **Chase Management** — Automated weekly chase alerts for untrusted agents (up to 5); auto-release
- **Amendment & Cancellation** — Date change requests with 20%/100% fee rules; cancellation requests with admin confirmation
- **Passport OCR** — Automated passport data extraction via GPT-4o Vision, linked per booking
- **Voucher Management** — Generate and manage booking vouchers
- **Notifications** — In-app notification center for booking alerts and system events
- **User Management** — Role-based access control (5 roles)
- **Slot Alerts** — Automated urgency alerts when permit slots drop below thresholds

---

## Tech Stack

### Backend
- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM with PostgreSQL
- **Alembic** — Database migrations
- **EasyOCR / Tesseract** — Passport OCR processing
- **Playwright** — Headless browser scraping
- **APScheduler** — Scheduled chase, overdue, and slot alert jobs
- **python-jose** — JWT authentication
- **OpenAI / Gemini** — AI-assisted data extraction

### Frontend
- **React** — UI framework
- **Tailwind CSS** — Styling
- **Recharts** — Charts
- **Heroicons** — Icons

### Infrastructure
- **PostgreSQL 16** — Primary database
- **Docker** — Container for local PostgreSQL (`imai-postgres`)

---

## Roles & Access

| Role | Access |
|------|--------|
| `user` | Own bookings only |
| `admin` | All bookings, permit purchasing, full dashboard |
| `finance_admin` | Finance Dashboard, AR/AP, payment validation, chase |
| `superuser` | Everything — user management, full system visibility |
| `authorizer` | Authorizer Dashboard — approves/declines authorization requests |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop

### 1. Clone the repo

```bash
git clone https://github.com/Mrfabm/TrekDesk.git
cd TrekDesk
```

### 2. Start PostgreSQL with Docker

```bash
docker run -d --name imai-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=booking_db \
  -p 5432:5432 \
  postgres:16
```

### 3. Configure the backend

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/booking_db
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
POPPLER_PATH=C:\path\to\poppler\bin
TESSERACT_PATH=C:\path\to\tesseract.exe
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=10485760
```

### 4. Set up the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
playwright install chromium
```

### 5. Start the backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

On first run, the app automatically:
- Creates all 19 database tables
- Seeds Sites, Products, and system users
- Runs enum migrations for PostgreSQL

### 6. Set up and start the frontend

```bash
cd frontend
npm install
npm start
```

### 7. Open the app

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

---

## Default Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | superuser |
| admin@test.com | admin123 | admin |
| user@test.com | user123 | user |
| finance@test.com | finance123 | finance_admin |
| authorizer@test.com | auth123 | authorizer |

> Change default passwords after first login in a production environment.

### (Optional) Seed demo scenarios

To populate the database with 29 realistic booking scenarios covering all statuses, AR/AP states, and rolling deposit examples:

```bash
cd backend
python seed_scenarios.py
```

---

## Project Structure

```
TrekDesk/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models (19 tables)
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Rolling deposit, email, background services
│   │   └── utils/         # OCR and passport utilities
│   ├── migrations/        # Alembic migration scripts
│   ├── seed_scenarios.py  # Demo data seed script (29 scenarios)
│   ├── run.py             # Start with PostgreSQL
│   ├── run_sqlite.py      # Start with SQLite (offline/dev)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/    # Reusable UI components
        ├── pages/         # Application pages
        └── utils/         # API client and helpers
```

---

## Database

See [docs/DATABASE.md](docs/DATABASE.md) for:
- All 19 tables with columns, types, and relationships
- Booking status lifecycle diagram
- Migration to cloud guide (Supabase, Railway, AWS RDS, Docker Compose)
- Entity relationship diagram

---

## License

MIT
