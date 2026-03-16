from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Enum
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime
import enum

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    DEPOSIT_PAID = "deposit_paid"
    FULLY_PAID = "fully_paid"
    OVERDUE = "overdue"

class ValidationStatus(str, enum.Enum):
    PENDING = "pending"
    OK_FULL = "ok_to_purchase_full"
    OK_DEPOSIT = "ok_to_purchase_deposit"
    NOT_OK = "do_not_purchase"

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    amount = Column(Numeric(10, 2))  # Total amount for the booking
    deposit_amount = Column(Numeric(10, 2))  # Required deposit amount
    deposit_paid = Column(Numeric(10, 2), default=0)  # Actual deposit paid
    balance_due = Column(Numeric(10, 2))  # Remaining balance
    unit_cost = Column(Numeric(10, 2))  # Cost per person
    units = Column(Integer)  # Number of people
    payment_status = Column(Enum(PaymentStatus))
    validation_status = Column(Enum(ValidationStatus), default=ValidationStatus.PENDING)
    validation_notes = Column(String, nullable=True)
    deposit_due_date = Column(DateTime)
    balance_due_date = Column(DateTime)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booking = relationship("Booking", back_populates="payment")
    validator = relationship("User", back_populates="validated_payments")