from sqlalchemy import Column, Integer, DateTime, String
from . import Base
from datetime import datetime

class ScrapeStatus(Base):
    __tablename__ = "scrape_status"
    
    id = Column(Integer, primary_key=True, index=True)
    last_run = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # 'success' or 'failed'
    message = Column(String, nullable=True) 