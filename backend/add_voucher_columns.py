from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create database engine
engine = create_engine(os.getenv('DATABASE_URL'))

# SQL statement to add columns
add_columns_sql = """
ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS booking_ref VARCHAR,
    ADD COLUMN IF NOT EXISTS invoice_no VARCHAR,
    ADD COLUMN IF NOT EXISTS voucher_number VARCHAR,
    ADD COLUMN IF NOT EXISTS request_date DATE,
    ADD COLUMN IF NOT EXISTS trek_date DATE,
    ADD COLUMN IF NOT EXISTS head_of_file VARCHAR,
    ADD COLUMN IF NOT EXISTS agent_client VARCHAR,
    ADD COLUMN IF NOT EXISTS total_amount FLOAT,
    ADD COLUMN IF NOT EXISTS paid_amount FLOAT;
"""

try:
    with engine.connect() as conn:
        conn.execute(text(add_columns_sql))
        conn.commit()
        print("Successfully added voucher columns to bookings table")
except Exception as e:
    print(f"Error updating database: {str(e)}") 