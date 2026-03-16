from sqlalchemy import Column, Integer, String, DateTime
from . import Base
from datetime import datetime

class AvailableSlot(Base):
    __tablename__ = "available_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String)  # Date in format "dd/mm/yyyy"
    slots = Column(String)  # Number of slots or "Sold Out"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 