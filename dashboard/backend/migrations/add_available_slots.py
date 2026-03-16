from sqlalchemy import create_engine
from sqlalchemy.sql import text
from dotenv import load_dotenv
import os

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL)

def recreate_column():
    with engine.connect() as connection:
        # First drop the column if it exists
        connection.execute(text("""
            ALTER TABLE bookings 
            DROP COLUMN IF EXISTS available_slots;
        """))
        
        # Then add the column again
        connection.execute(text("""
            ALTER TABLE bookings 
            ADD COLUMN available_slots INTEGER;
        """))
        connection.commit()
        print("Successfully recreated available_slots column in bookings table")

if __name__ == "__main__":
    recreate_column() 