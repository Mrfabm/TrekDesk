from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL)

def create_available_slots_table():
    with engine.connect() as connection:
        # Create the available_slots table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS available_slots (
                id SERIAL PRIMARY KEY,
                date VARCHAR(255) NOT NULL,
                slots VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create index on date column for faster queries
            CREATE INDEX IF NOT EXISTS idx_available_slots_date ON available_slots(date);
        """))
        
        connection.commit()
        print("Successfully created available_slots table")

if __name__ == "__main__":
    create_available_slots_table() 