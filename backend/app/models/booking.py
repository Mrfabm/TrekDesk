from enum import Enum
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum as SQLEnum, DateTime, Float
from sqlalchemy.orm import relationship
from . import Base
from datetime import datetime

class BookingStatus(str, Enum):
    PROVISIONAL = "provisional"
    REQUESTED = "requested"      # When user requests confirmation
    VR = "validation_request"    # When admin sends to finance
    CONFIRMED = "confirmed"      # Final confirmation by admin
    REJECTED = "rejected"        # If rejected at any stage
    AMENDED = "amended"         # When booking details are changed

class PaymentStatus(str, Enum):
    PENDING = "pending"
    DEPOSIT_PAID = "deposit_paid"
    PARTIAL = "partial"
    FULLY_PAID = "fully_paid"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"

class ValidationStatus(str, Enum):
    PENDING = "pending"
    OK_TO_PURCHASE_FULL = "ok_to_purchase_full"
    OK_TO_PURCHASE_DEPOSIT = "ok_to_purchase_deposit"
    DO_NOT_PURCHASE = "do_not_purchase"

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_name = Column(String)
    booking_ref = Column(String, unique=True)
    invoice_no = Column(String)
    number_of_permits = Column(Integer)
    voucher_number = Column(String)
    date_of_request = Column(Date)  # Request date from voucher
    trekking_date = Column(Date)    # Trek date from voucher
    head_of_file = Column(String)   # From voucher
    agent_client = Column(String)   # First 3 letters of booking ref
    product = Column(String)        # Mountain Gorillas or Golden Monkeys
    date = Column(Date)            # Same as trekking_date
    people = Column(Integer)       # Same as number_of_permits
    total_amount = Column(Float)
    paid_amount = Column(Float, default=0.0)
    booking_status = Column(SQLEnum(BookingStatus), default=BookingStatus.PROVISIONAL)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    validation_status = Column(SQLEnum(ValidationStatus), default=ValidationStatus.PENDING)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"))
    site_id = Column(Integer, ForeignKey("sites.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    # Relationships
    user = relationship("User", back_populates="bookings")
    site = relationship("Site")
    product_rel = relationship("Product")  # Renamed to avoid conflict with product column
    payment = relationship("Payment", back_populates="booking", uselist=False)

    def calculate_total_amount(self):
        """Calculate total amount based on product and number of people"""
        if self.product == "Mountain Gorillas":
            return 1500 * self.people
        elif self.product == "Golden Monkeys":
            return 100 * self.people
        return 0.0

    def update_from_voucher(self, voucher_data: dict):
        """Update booking details from voucher data"""
        self.booking_name = voucher_data['booking_name']
        self.booking_ref = voucher_data['booking_reference']
        self.trekking_date = datetime.strptime(voucher_data['trek_date'], "%Y-%m-%d").date()
        self.date = self.trekking_date
        self.head_of_file = voucher_data['head_of_file']
        self.date_of_request = datetime.strptime(voucher_data['request_date'], "%Y-%m-%d").date()
        self.agent_client = voucher_data['agent_client']
        self.product = voucher_data['product_type']
        self.people = voucher_data['number_of_people']
        self.number_of_permits = self.people
        self.total_amount = self.calculate_total_amount()
        self.booking_status = BookingStatus.REQUESTED