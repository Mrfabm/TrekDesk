from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime
import enum


class ChaseStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"   # Payment eventually received, admin resolved manually
    RELEASED = "released"   # Auto-released after 5 failed chases


class ChaseRecord(Base):
    __tablename__ = "chase_records"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)
    chase_count = Column(Integer, default=0)          # 0–5
    last_chase_at = Column(DateTime, nullable=True)
    next_chase_at = Column(DateTime, nullable=True)   # Scheduler fires when this < now
    status = Column(SQLEnum(ChaseStatus), default=ChaseStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="chase_record")
