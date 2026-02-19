from fastapi import APIRouter
from . import auth, users, bookings, available_slots, notifications, finance, golden_monkey_slots, passport, voucher

api_router = APIRouter()

# Include all routes with proper prefixes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(available_slots.router, prefix="/available-slots", tags=["available-slots"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(finance.router, prefix="/finance", tags=["finance"])
api_router.include_router(golden_monkey_slots.router, prefix="/golden-monkey-slots", tags=["golden-monkey-slots"])
api_router.include_router(passport.router, prefix="/passport", tags=["passport"])
api_router.include_router(voucher.router, prefix="/voucher", tags=["voucher"])