from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from . import Base

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # Volcanoes National Park or Nyungwe Forest National Park
    products = relationship("Product", back_populates="site")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"))
    site = relationship("Site", back_populates="products")