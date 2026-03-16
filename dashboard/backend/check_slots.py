from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
from app.models.golden_monkey_slots import GoldenMonkeySlot

def check_slots():
    db = SessionLocal()
    try:
        gorilla_slots = db.query(AvailableSlot).count()
        monkey_slots = db.query(GoldenMonkeySlot).count()
        
        print(f"Mountain Gorilla slots in database: {gorilla_slots}")
        print(f"Golden Monkey slots in database: {monkey_slots}")
        
        # Show some sample entries
        print("\nLatest Mountain Gorilla slots:")
        for slot in db.query(AvailableSlot).limit(5):
            print(f"Date: {slot.date}, Slots: {slot.slots}")
            
        print("\nLatest Golden Monkey slots:")
        for slot in db.query(GoldenMonkeySlot).limit(5):
            print(f"Date: {slot.date}, Slots: {slot.slots}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_slots() 