from sqlalchemy import create_engine
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base
from app.models.user import User
from app.models.booking import Booking
from app.models.activity_log import ActivityLog
from app.models.site import Site
from app.models.notification import Notification
from app.models.available_slots import AvailableSlot
from app.models.passport_data import PassportData
from app.models.payment import Payment
from app.models.scrape_status import ScrapeStatus

def init_db():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Database tables created successfully")
    except Exception as e:
        print(f"✗ Error creating database tables: {str(e)}")

if __name__ == "__main__":
    init_db() 