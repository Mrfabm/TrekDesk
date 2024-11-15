from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models after Base is defined
from .user import User
from .site import Site, Product
from .booking import Booking
from .payment import Payment
from .activity_log import ActivityLog
from .notification import Notification
from .available_slots import AvailableSlot 