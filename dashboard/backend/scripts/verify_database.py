import sys
import os

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
from app.models.scrape_status import ScrapeStatus

def verify_database():
    db = SessionLocal()
    try:
        # Check scrape status
        status = db.query(ScrapeStatus)\
            .order_by(ScrapeStatus.last_run.desc())\
            .first()
        print("\nLatest Scrape Status:")
        print(f"Status: {status.status if status else 'No status'}")
        print(f"Message: {status.message if status else 'No message'}")
        print(f"Last Run: {status.last_run if status else 'Never'}")
        
        # Check available slots
        slots = db.query(AvailableSlot).all()
        print(f"\nFound {len(slots)} slots in database:")
        for slot in slots[:5]:  # Show first 5 slots
            print(f"Date: {slot.date}, Slots: {slot.slots}")
            
    finally:
        db.close()

if __name__ == "__main__":
    verify_database() 