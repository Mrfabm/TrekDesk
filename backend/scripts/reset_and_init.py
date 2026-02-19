import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models.available_slots import AvailableSlot
from app.models.scrape_status import ScrapeStatus

def reset_database():
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database reset complete!")

if __name__ == "__main__":
    reset_database() 