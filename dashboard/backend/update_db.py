from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create database engine
engine = create_engine(os.getenv('DATABASE_URL'))

# SQL statements to add columns
add_columns_sql = """
ALTER TABLE passport_data 
    ADD COLUMN IF NOT EXISTS confidence_score FLOAT,
    ADD COLUMN IF NOT EXISTS extraction_status VARCHAR,
    ADD COLUMN IF NOT EXISTS source_file VARCHAR,
    ADD COLUMN IF NOT EXISTS extraction_error TEXT;
"""

try:
    with engine.connect() as conn:
        conn.execute(text(add_columns_sql))
        conn.commit()
        print("Successfully added missing columns to passport_data table")
except Exception as e:
    print(f"Error updating database: {str(e)}") 