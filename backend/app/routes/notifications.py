from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.notification import Notification, NotificationType, NotificationPriority, NotificationStatus
from ..utils.auth import get_current_user
from ..services.email_service import send_email_notification, send_urgent_notification, send_alert_notification
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    priority: NotificationPriority = NotificationPriority.MEDIUM
    requires_action: bool = False
    action_url: Optional[str] = None

@router.get("")
async def get_notifications(
    status: NotificationStatus = NotificationStatus.UNREAD,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.status == status
        )
        .order_by(Notification.created_at.desc())
        .all()
    )
    return notifications

@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.status = NotificationStatus.READ
    notification.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/{notification_id}/archive")
async def archive_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.status = NotificationStatus.ARCHIVED
    db.commit()
    return {"message": "Notification archived"}

async def send_notification_email(user: User, notification: Notification):
    if notification.priority == NotificationPriority.URGENT:
        await send_urgent_notification(
            email=user.email,
            subject=f"Urgent: {notification.title}",
            message=notification.message
        )
    else:
        await send_alert_notification(
            email=user.email,
            subject=notification.title,
            message=notification.message,
            priority=notification.priority.value
        )

# Helper function to create notifications
async def create_notification(
    db: Session,
    user_id: int,
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = False
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_notification = Notification(
        user_id=user_id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        priority=notification.priority,
        requires_action=notification.requires_action,
        action_url=notification.action_url
    )
    db.add(db_notification)
    db.commit()
    
    # Send email if required
    if send_email:
        background_tasks.add_task(send_notification_email, user, db_notification)
    
    return db_notification

# Helper function to notify admins
async def notify_admins(
    db: Session,
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = False
):
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        await create_notification(db, admin.id, notification, background_tasks, send_email)

# Helper function to notify finance admins
async def notify_finance_admins(
    db: Session,
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = False
):
    finance_admins = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
    for admin in finance_admins:
        await create_notification(db, admin.id, notification, background_tasks, send_email)

# Helper function to notify specific user
async def notify_user(
    db: Session,
    user_id: int,
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    send_email: bool = False
):
    await create_notification(db, user_id, notification, background_tasks, send_email)