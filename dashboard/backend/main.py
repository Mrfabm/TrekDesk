from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.bookings import router as bookings_router
from app.routes.finance import router as finance_router
from app.routes.notifications import router as notifications_router
from app.routes.available_slots import router as available_slots_router
from app.utils.auth import get_current_user

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(bookings_router, prefix="/api/bookings", tags=["bookings"])
app.include_router(finance_router, prefix="/api/finance", tags=["finance"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(available_slots_router, prefix="/api/available-slots", tags=["available-slots"])

@app.get("/")
async def root():
    return {"message": "Booking API"}