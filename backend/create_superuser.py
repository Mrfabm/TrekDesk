from app.database import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_superuser():
    db = SessionLocal()
    try:
        # Check if superuser already exists
        if db.query(User).filter(User.role == UserRole.SUPERUSER).first():
            print("✓ Superuser already exists")
            return

        # Create superuser
        superuser = User(
            email="admin@example.com",
            username="admin",
            role=UserRole.SUPERUSER,
            hashed_password=pwd_context.hash("admin123"),
            is_active=True
        )
        
        db.add(superuser)
        db.commit()
        print("✓ Superuser created successfully")
        print("Email: admin@example.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"✗ Error creating superuser: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_superuser() 