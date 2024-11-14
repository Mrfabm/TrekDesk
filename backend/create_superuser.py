from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_superuser():
    db = SessionLocal()
    
    try:
        # Check if superuser already exists
        if db.query(User).filter(User.email == "admin@example.com").first():
            print("Superuser already exists")
            return
            
        # Create superuser using the UserRole enum
        hashed_password = pwd_context.hash("admin123")
        superuser = User(
            email="admin@example.com",
            username="admin",
            hashed_password=hashed_password,
            role=UserRole.SUPERUSER,
            is_active=True
        )
        
        db.add(superuser)
        db.commit()
        print("Superuser created successfully")
    except Exception as e:
        print(f"Error creating superuser: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_superuser() 