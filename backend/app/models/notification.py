from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base
import enum

class NotificationType(enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    URGENT = "urgent"

class NotificationPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationStatus(enum.Enum):
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(Enum(NotificationType), default=NotificationType.INFO)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.MEDIUM)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.UNREAD)
    title = Column(String)
    message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    requires_action = Column(Boolean, default=False)
    action_url = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

    class Config:
        orm_mode = True 