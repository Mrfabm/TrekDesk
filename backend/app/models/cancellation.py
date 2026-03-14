from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime
import enum


class CancellationStatus(str, enum.Enum):
    PENDING = "pending"       # User requested, awaiting admin confirmation
    CONFIRMED = "confirmed"   # Admin confirmed — booking is CANCELLED, payment preserved
    REJECTED = "rejected"     # Admin rejected the cancellation request


class CancellationRequest(Base):
    __tablename__ = "cancellation_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    reason = Column(String, nullable=True)
    status = Column(SQLEnum(CancellationStatus), default=CancellationStatus.PENDING)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_notes = Column(String, nullable=True)   # e.g. "Non-refundable. Cancelled by admin on date."
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="cancellation_requests")
    requester = relationship("User", foreign_keys=[requested_by])
    confirmer = relationship("User", foreign_keys=[confirmed_by])
