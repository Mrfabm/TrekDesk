from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base
from datetime import datetime

class PassportData(Base):
    __tablename__ = "passport_data"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    passport_number = Column(String, nullable=False, unique=True)
    passport_expiry = Column(Date, nullable=False)
    nationality = Column(String, nullable=True)
    place_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    document_file = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True, default=1.0)
    source_file = Column(String, nullable=True)
    extraction_status = Column(String, nullable=True)  # complete, incomplete, error
    extraction_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    user = relationship("User", back_populates="passport_data")
    
    def model_dump(self):
        """Convert model instance to dictionary"""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "date_of_birth": self.date_of_birth,
            "passport_number": self.passport_number,
            "passport_expiry": self.passport_expiry,
            "nationality": self.nationality,
            "place_of_birth": self.place_of_birth,
            "gender": self.gender,
            "document_file": self.document_file,
            "confidence_score": self.confidence_score,
            "source_file": self.source_file,
            "extraction_status": self.extraction_status,
            "extraction_error": self.extraction_error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "user_id": self.user_id
        }