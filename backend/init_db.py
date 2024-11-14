from app.database import engine
from app.models import Base, User  # Import both Base and User

def init_db():
    print("Creating database tables...")
    try:
        Base.metadata.drop_all(bind=engine)  # Drop existing tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db() 