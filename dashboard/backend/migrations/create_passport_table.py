import sys
import os
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, MetaData, inspect
from sqlalchemy.schema import CreateTable
from app.models.passport_data import PassportData
from app.database import SQLALCHEMY_DATABASE_URL

def create_passport_table():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)
    
    # Check if table exists
    if 'passport_data' in inspector.get_table_names():
        print("✓ Passport data table already exists")
        return
    
    # Create table if it doesn't exist
    try:
        PassportData.__table__.create(engine)
        print("✓ Passport data table created successfully")
    except Exception as e:
        print(f"✗ Error creating passport table: {str(e)}")

if __name__ == "__main__":
    create_passport_table() 