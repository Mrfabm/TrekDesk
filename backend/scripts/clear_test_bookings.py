from sqlalchemy import create_engine
from sqlalchemy.sql import text
from dotenv import load_dotenv
import os

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL)

def clear_bookings():
    with engine.connect() as connection:
        # Delete all existing bookings
        connection.execute(text("""
            DELETE FROM bookings;
        """))
        connection.commit()
        print("Successfully cleared all test bookings from the database")

if __name__ == "__main__":
    clear_bookings() 