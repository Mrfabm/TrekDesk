import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.activity_log import ActivityLog
from app.models.notification import Notification
from app.models.passport_data import PassportData
from sqlalchemy import text

def clear_data():
    db = SessionLocal()
    try:
        # Clear specific tables while preserving users and site data
        # Order matters due to foreign key constraints
        db.execute(text('DELETE FROM payments;'))
        db.execute(text('DELETE FROM activity_logs;'))
        db.execute(text('DELETE FROM notifications;'))
        db.execute(text('DELETE FROM passport_data;'))
        db.execute(text('DELETE FROM bookings;'))
        
        # Reset sequences for PostgreSQL
        db.execute(text('ALTER SEQUENCE payments_id_seq RESTART WITH 1;'))
        db.execute(text('ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;'))
        db.execute(text('ALTER SEQUENCE notifications_id_seq RESTART WITH 1;'))
        db.execute(text('ALTER SEQUENCE passport_data_id_seq RESTART WITH 1;'))
        db.execute(text('ALTER SEQUENCE bookings_id_seq RESTART WITH 1;'))
        
        db.commit()
        print("Data cleared successfully!")
    except Exception as e:
        print(f"Error clearing data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_data() 