from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime


class AuthorizationRequest(Base):
    __tablename__ = "authorization_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    reason = Column(Text)
    proof_documents = Column(String)      # comma-separated filenames / URLs
    deadline = Column(DateTime)
    status = Column(String, default="pending")   # pending | authorized | declined
    requested_by = Column(Integer, ForeignKey("users.id"))
    authorizer_id = Column(Integer, ForeignKey("users.id"))
    authorizer_notes = Column(Text)
    auto_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking")
    requester = relationship("User", foreign_keys=[requested_by])
    authorizer_user = relationship("User", foreign_keys=[authorizer_id])
    appeal = relationship("Appeal", back_populates="authorization_request", uselist=False)


class Appeal(Base):
    __tablename__ = "appeals"

    id = Column(Integer, primary_key=True, index=True)
    authorization_request_id = Column(Integer, ForeignKey("authorization_requests.id"))
    appeal_notes = Column(Text)
    appeal_documents = Column(String)
    status = Column(String, default="pending")   # pending | approved | rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    authorization_request = relationship("AuthorizationRequest", back_populates="appeal")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
