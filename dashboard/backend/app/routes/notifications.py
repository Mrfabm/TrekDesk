from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.notification import Notification
from ..utils.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
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
    
    notification.read = True
    db.commit()
    return {"message": "Notification marked as read"}

# Helper function to create notifications
def create_notification(db: Session, user_id: int, type: str, message: str, data: dict):
    notification = Notification(
        user_id=user_id,
        type=type,
        message=message,
        data=data
    )
    db.add(notification)
    db.commit()
    return notification

# Helper function to notify admins
def notify_admins(db: Session, type: str, message: str, data: dict):
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for admin in admins:
        create_notification(db, admin.id, type, message, data)

# Helper function to notify finance admins
def notify_finance_admins(db: Session, type: str, message: str, data: dict):
    finance_admins = db.query(User).filter(User.role == UserRole.FINANCE_ADMIN).all()
    for admin in finance_admins:
        create_notification(db, admin.id, type, message, data)

# Helper function to notify specific user
def notify_user(db: Session, user_id: int, type: str, message: str, data: dict):
    create_notification(db, user_id, type, message, data)