import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from . import Base


class AgentClientType(str, enum.Enum):
    AGENT = "agent"
    CLIENT = "client"


class AgentClient(Base):
    __tablename__ = "agent_clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(SQLEnum(AgentClientType), default=AgentClientType.AGENT, nullable=False)
    is_trusted = Column(Boolean, default=False, nullable=False)
    has_rolling_deposit = Column(Boolean, default=False, nullable=False)
    email = Column(String)
    phone = Column(String)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="agent_client_rel")
