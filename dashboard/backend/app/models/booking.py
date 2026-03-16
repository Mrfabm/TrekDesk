from enum import Enum
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime

class BookingStatus(str, Enum):
    PROVISIONAL = "provisional"
    REQUESTED = "requested"      # When user requests confirmation
    VR = "validation_request"    # When admin sends to finance
    CONFIRMED = "confirmed"      # Final confirmation by admin
    REJECTED = "rejected"        # If rejected at any stage

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    booking_name = Column(String)
    number_of_people = Column(Integer)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PROVISIONAL)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    site_id = Column(Integer, ForeignKey("sites.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    available_slots = Column(Integer)
    
    user = relationship("User", back_populates="bookings")
    site = relationship("Site")
    product = relationship("Product")
    payment = relationship("Payment", back_populates="booking", uselist=False)