from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import api_router, auth, users, bookings, notifications, finance, passport, voucher
from .database import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

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

@app.get("/")
async def root():
    return {"message": "API is running"} 