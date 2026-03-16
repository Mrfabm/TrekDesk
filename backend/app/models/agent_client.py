import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from . import Base


class AgentClientType(str, enum.Enum):
    AGENT = "agent"
    CLIENT = "client"


class PaymentTermsAnchor(str, enum.Enum):
    FROM_REQUEST       = "from_request"        # X days after booking request date
    FROM_AUTHORIZATION = "from_authorization"  # X days after auth is granted
    BEFORE_TREK        = "before_trek"         # X days before trek date (balance only)


class RollingDepositTransactionType(str, enum.Enum):
    TOP_UP     = "top_up"      # Agent sends funds to replenish pot
    APPLIED    = "applied"     # Funds used to cover permit purchase
    RETURNED   = "returned"    # Funds restored after agent pays booking
    ADJUSTMENT = "adjustment"  # Manual correction by finance


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

    # Payment terms
    payment_terms_deposit_days = Column(Integer, default=7)   # days until deposit is due
    payment_terms_balance_days = Column(Integer, default=45)  # days until balance is due
    payment_terms_anchor = Column(
        SQLEnum(PaymentTermsAnchor, values_callable=lambda x: [e.value for e in x]),
        default=PaymentTermsAnchor.FROM_REQUEST,
    )

    # Rolling deposit account
    rolling_deposit_limit   = Column(Float, default=0.0)   # agreed total pot (e.g. $10,000)
    rolling_deposit_balance = Column(Float, default=0.0)   # currently available

    bookings = relationship("Booking", back_populates="agent_client_rel")
    rolling_deposit_transactions = relationship(
        "RollingDepositTransaction", back_populates="agent_client"
    )


class RollingDepositTransaction(Base):
    __tablename__ = "rolling_deposit_transactions"

    id             = Column(Integer, primary_key=True, index=True)
    agent_client_id = Column(Integer, ForeignKey("agent_clients.id"), nullable=False)
    booking_id     = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    type           = Column(SQLEnum(RollingDepositTransactionType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    amount         = Column(Float, nullable=False)   # always positive
    balance_after  = Column(Float, nullable=False)   # running balance snapshot
    notes          = Column(Text)
    created_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    agent_client = relationship("AgentClient", back_populates="rolling_deposit_transactions")
    booking      = relationship("Booking")
    creator      = relationship("User", foreign_keys=[created_by])


class PaymentDueAudit(Base):
    __tablename__ = "payment_due_audits"

    id            = Column(Integer, primary_key=True, index=True)
    payment_id    = Column(Integer, ForeignKey("payments.id"), nullable=False)
    field_changed = Column(String, nullable=False)  # deposit_due_date | balance_due_date
    old_value     = Column(DateTime)
    new_value     = Column(DateTime)
    reason        = Column(Text)
    changed_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at    = Column(DateTime, default=datetime.utcnow)

    payment    = relationship("Payment")
    changed_by_user = relationship("User", foreign_keys=[changed_by])
