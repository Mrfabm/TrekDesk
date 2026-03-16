from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL)

def clear_bookings():
    try:
        with engine.connect() as connection:
            # Get current count of bookings
            result = connection.execute(text("SELECT COUNT(*) FROM bookings"))
            count = result.scalar()
            
            # Ask for confirmation
            confirm = input(f"This will delete {count} bookings. Are you sure? (yes/no): ")
            
            if confirm.lower() == 'yes':
                # Delete all bookings
                connection.execute(text("DELETE FROM bookings"))
                connection.commit()
                print(f"Successfully deleted {count} bookings")
            else:
                print("Operation cancelled")
                
    except Exception as e:
        print(f"Error clearing bookings: {str(e)}")

if __name__ == "__main__":
    clear_bookings() 