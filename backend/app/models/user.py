from sqlalchemy import Column, Integer, String, Enum, Boolean
from sqlalchemy.orm import relationship
from . import Base
import enum

# Import all models to avoid circular dependencies
from .passport_data import PassportData
from .booking import Booking
from .activity_log import ActivityLog
from .payment import Payment
from .notification import Notification

class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERUSER = "superuser"
    FINANCE_ADMIN = "finance_admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)

    # Relationships
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user")
    validated_payments = relationship("Payment", back_populates="validator")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    passport_data = relationship("PassportData", back_populates="user", uselist=False)

    class Config:
        orm_mode = True