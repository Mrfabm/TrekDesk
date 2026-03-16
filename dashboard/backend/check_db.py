from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create database engine
engine = create_engine(os.getenv('DATABASE_URL'))

# Check if columns exist and add them if they don't
with engine.connect() as conn:
    # Check if confidence_score column exists
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'passport_data' 
        AND column_name = 'confidence_score';
    """))
    
    if not result.fetchone():
        print("Adding confidence_score column...")
        conn.execute(text("""
            ALTER TABLE passport_data 
            ADD COLUMN confidence_score FLOAT;
        """))
        conn.commit()
    
    # Check if extraction_status column exists
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'passport_data' 
        AND column_name = 'extraction_status';
    """))
    
    if not result.fetchone():
        print("Adding extraction_status column...")
        conn.execute(text("""
            ALTER TABLE passport_data 
            ADD COLUMN extraction_status VARCHAR;
        """))
        conn.commit()
    
print("Database structure check complete") 