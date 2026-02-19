import sys
import os
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def add_passport_columns():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    try:
        # Add new columns if they don't exist
        with engine.connect() as connection:
            # Check if columns exist
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'passport_data' 
                AND column_name IN ('nationality', 'place_of_birth', 'gender')
            """))
            existing_columns = [row[0] for row in result]
            
            # Add nationality column
            if 'nationality' not in existing_columns:
                connection.execute(text("""
                    ALTER TABLE passport_data 
                    ADD COLUMN nationality VARCHAR
                """))
                print("✓ Added nationality column")
            
            # Add place_of_birth column
            if 'place_of_birth' not in existing_columns:
                connection.execute(text("""
                    ALTER TABLE passport_data 
                    ADD COLUMN place_of_birth VARCHAR
                """))
                print("✓ Added place_of_birth column")
            
            # Add gender column
            if 'gender' not in existing_columns:
                connection.execute(text("""
                    ALTER TABLE passport_data 
                    ADD COLUMN gender VARCHAR
                """))
                print("✓ Added gender column")
            
            connection.commit()
            print("✓ All columns added successfully")
            
    except Exception as e:
        print(f"✗ Error adding columns: {str(e)}")

if __name__ == "__main__":
    add_passport_columns() 