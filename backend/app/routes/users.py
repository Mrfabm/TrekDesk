from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..utils.auth import get_current_user
from passlib.context import CryptContext
from pydantic import BaseModel
from ..models.activity_log import ActivityLog

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def log_activity(db: Session, user_id: int, action: str, details: dict = None, ip_address: str = None):
    activity_log = ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(activity_log)
    db.commit()

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    role: str
    is_trusted_agent: bool = False
    has_rolling_deposit: bool = False


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.get("")
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view users"
        )
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "is_trusted_agent": user.is_trusted_agent,
            "has_rolling_deposit": user.has_rolling_deposit,
        } for user in users
    ]

@router.post("")
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create users"
        )

    # Check if user with email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username is taken
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    hashed_password = pwd_context.hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role=UserRole[user_data.role.upper()],
        is_trusted_agent=user_data.is_trusted_agent,
        has_rolling_deposit=user_data.has_rolling_deposit,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        log_activity(
            db=db,
            user_id=current_user.id,
            action="Created new user",
            details={"created_user": db_user.username}
        )
        return {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "role": db_user.role.value,
            "is_trusted_agent": db_user.is_trusted_agent,
            "has_rolling_deposit": db_user.has_rolling_deposit,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete users"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    try:
        db.delete(user)
        db.commit()
        log_activity(
            db=db,
            user_id=current_user.id,
            action="Deleted user",
            details={"deleted_user": user.username}
        )
        return {"message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.put("/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify users"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check email uniqueness if changed
    if user_data.email != user.email:
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = user_data.email

    # Check username uniqueness if changed
    if user_data.username != user.username:
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = user_data.username

    # Update password if provided
    if user_data.password:
        user.hashed_password = pwd_context.hash(user_data.password)

    user.role = UserRole[user_data.role.upper()]
    user.is_trusted_agent = user_data.is_trusted_agent
    user.has_rolling_deposit = user_data.has_rolling_deposit

    try:
        db.commit()
        db.refresh(user)
        log_activity(
            db=db,
            user_id=current_user.id,
            action="Updated user",
            details={"updated_user": user.username}
        )
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "is_trusted_agent": user.is_trusted_agent,
            "has_rolling_deposit": user.has_rolling_deposit,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.get("/metrics")
async def get_user_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view metrics"
        )
    
    total_users = db.query(User).count()
    role_breakdown = {}
    for role in UserRole:
        count = db.query(User).filter(User.role == role).count()
        role_breakdown[role.value] = count
    return {"total_users": total_users, "role_breakdown": role_breakdown}

@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reset passwords"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.hashed_password = pwd_context.hash(new_password)

    try:
        db.commit()
        return {"message": "Password reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting password: {str(e)}"
        )

@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not pwd_context.verify(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = pwd_context.hash(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/activity-logs")
async def get_activity_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view activity logs"
        )

    logs = (
        db.query(ActivityLog)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "user_id": log.user_id,
            "username": log.user.username if log.user else f"User #{log.user_id}",
            "action": log.action,
            "created_at": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]