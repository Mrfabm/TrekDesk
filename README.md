# TrekDesk

A full-stack booking management system for gorilla and golden monkey trekking operations. Built to handle the complete booking lifecycle — from slot availability scraping and passport OCR to finance tracking and voucher generation.

---

## Features

- **Booking Management** — Create, track, and manage trekking bookings with status workflows
- **Slot Availability** — Real-time scraping of gorilla and golden monkey permit availability
- **Passport OCR** — Automated passport data extraction using EasyOCR and Tesseract
- **Finance Dashboard** — Payment tracking, validation, and financial reporting
- **Voucher Management** — Generate and manage booking vouchers
- **Notifications** — In-app notification center for booking alerts
- **User Management** — Role-based access control (Superuser, Admin, Staff)
- **Advanced Tracking** — Detailed booking filters and export options

---

## Tech Stack

### Backend
- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM with PostgreSQL
- **Alembic** — Database migrations
- **EasyOCR / Tesseract** — Passport OCR processing
- **Playwright** — Headless browser scraping
- **APScheduler** — Scheduled scraping jobs
- **python-jose** — JWT authentication
- **OpenAI / Gemini** — AI-assisted data extraction

### Frontend
- **React** — UI framework
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **TanStack Table** — Advanced data tables
- **Radix UI** — Accessible UI components
- **Lucide React** — Icons

### Infrastructure
- **PostgreSQL** — Primary database (via Docker)
- **Docker** — Container for local database

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
docker run -d --name trekdesk-postgres \
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

# Create database tables
python -c "from app.database import Base, engine; from app.models import *; Base.metadata.create_all(bind=engine)"

# Create superuser
python create_superuser.py
```

### 5. Start the backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Set up and start the frontend

```bash
cd frontend
npm install
npm start
```

### 7. Open the app

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

### Default login

| Field    | Value               |
|----------|---------------------|
| Email    | admin@example.com   |
| Password | admin123            |

> Change the default password after first login.

---

## Project Structure

```
TrekDesk/
├── backend/
│   ├── app/
│   │   ├── auth/          # JWT authentication
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Email and background services
│   │   └── utils/         # OCR and passport utilities
│   ├── migrations/        # Alembic migration scripts
│   ├── scripts/           # Database management scripts
│   ├── tests/             # Backend test suite
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/    # Reusable UI components
        ├── pages/         # Application pages
        ├── context/       # React context providers
        └── utils/         # API client and helpers
```

---

## License

MIT
