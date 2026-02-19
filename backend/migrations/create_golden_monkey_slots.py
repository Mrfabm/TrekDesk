import sys
import os

# Add the parent directory to Python path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from app.database import SQLALCHEMY_DATABASE_URL
from app.models.golden_monkey_slots import GoldenMonkeySlot
from app.models import Base

def create_golden_monkey_slots_table():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    print("Golden Monkey slots table created successfully")

if __name__ == "__main__":
    create_golden_monkey_slots_table() 