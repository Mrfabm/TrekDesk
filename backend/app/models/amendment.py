from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime
import enum


class AmendmentFeeType(str, enum.Enum):
    SAME_YEAR_20PCT = "same_year_20pct"   # 20% of full permit cost
    NEXT_YEAR_FULL = "next_year_full"     # Full permit cost (new year = new purchase)


class AmendmentStatus(str, enum.Enum):
    PENDING = "pending"             # Awaiting finance fee confirmation + admin confirmation
    FEE_PAID = "fee_paid"           # Finance confirmed fee received
    CONFIRMED = "confirmed"         # Admin confirmed amendment, booking date updated
    REJECTED = "rejected"           # Admin rejected the amendment request


class AmendmentRequest(Base):
    __tablename__ = "amendment_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    original_date = Column(Date, nullable=False)
    requested_date = Column(Date, nullable=False)
    reason = Column(String, nullable=True)
    fee_type = Column(SQLEnum(AmendmentFeeType), nullable=False)
    fee_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(SQLEnum(AmendmentStatus), default=AmendmentStatus.PENDING)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    fee_confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    booking = relationship("Booking", back_populates="amendment_requests")
    requester = relationship("User", foreign_keys=[requested_by])
    fee_confirmer = relationship("User", foreign_keys=[fee_confirmed_by])
    confirmer = relationship("User", foreign_keys=[confirmed_by])
