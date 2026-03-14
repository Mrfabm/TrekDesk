from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..utils.auth import create_access_token
from passlib.context import CryptContext
from pydantic import BaseModel

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginData(BaseModel):
    email: str
    password: str

class RegisterData(BaseModel):
    email: str
    username: str
    password: str

@router.post("/login")
async def login(login_data: LoginData, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token with user ID and role
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value  # Include the role value in the token
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value
    }


@router.post("/register", status_code=201)
async def register(data: RegisterData, db: Session = Depends(get_db)):
    """Public self-registration — always creates a USER-role account."""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=pwd_context.hash(data.password),
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role.value,
    }