import sys
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.site import Site, Product
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    logger.info("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    logger.info("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Database tables recreated successfully!")

def create_superuser(db):
    logger.info("Creating superuser...")
    if db.query(User).filter(User.email == "admin@example.com").first():
        logger.info("Superuser already exists")
        return
        
    hashed_password = pwd_context.hash("admin123")
    superuser = User(
        email="admin@example.com",
        username="admin",
        hashed_password=hashed_password,
        role=UserRole.SUPERUSER,
        is_active=True
    )
    
    db.add(superuser)
    db.commit()
    logger.info("Superuser created successfully")

def init_sites(db):
    logger.info("Initializing sites and products...")
    
    # Check if sites already exist
    if db.query(Site).first():
        logger.info("Sites already initialized")
        return

    # Create Volcanoes National Park
    volcanoes = Site(name="Volcanoes National Park")
    db.add(volcanoes)
    db.commit()
    db.refresh(volcanoes)

    volcanoes_products = [
        ("Mountain gorillas", 1500),
        ("Golden Monkeys", 100),
        ("Bisoke", 75),
        ("Buhanga Eco-park", 50),
        ("Buhanga Eco-park(1 day picnic including Camping)", 100),
        ("Dian Fossey Tomb", 75),
        ("Gahinga", 75),
        ("Muhabura", 75),
        ("Muhabura-Gahinga", 100),
        ("Nature walk", 50),
        ("Sabyinyo Volcano Climbing", 75),
        ("Hiking on a chain of volcanoes", 100)
    ]
    
    for product_name, unit_cost in volcanoes_products:
        product = Product(
            name=product_name, 
            site_id=volcanoes.id,
            unit_cost=unit_cost
        )
        db.add(product)

    # Create Nyungwe Forest National Park
    nyungwe = Site(name="Nyungwe Forest National Park")
    db.add(nyungwe)
    db.commit()
    db.refresh(nyungwe)

    nyungwe_products = [
        ("Bird Walk - Nyungwe Forest", 40),
        ("Canopy Walk", 40),
        ("Canopy Walk Exclusive", 1600),
        ("Chimps Trek", 150),
        ("Chimps Trek Exclusive", 2000),
        ("Colubus / Mangabey Monkey", 40),
        ("Colubus / Mangabey Monkey Exclusive", 1600),
        ("Entry fee 1st Night", 100),
        ("Entry fee Extra Night", 50),
        ("Nature Trails (Nyungwe National Park)", 40),
        ("Nature Walk 0-5km", 40),
        ("Waterfall- Kamiranzovu", 40),
        ("Waterfall- Ndambarare", 40)
    ]
    
    for product_name, unit_cost in nyungwe_products:
        product = Product(
            name=product_name,
            site_id=nyungwe.id,
            unit_cost=unit_cost
        )
        db.add(product)

    db.commit()
    logger.info("Sites and products initialized successfully")

def verify_setup(db):
    logger.info("\nVerifying setup...")
    
    # Check users
    users_count = db.query(User).count()
    logger.info(f"Users in database: {users_count}")
    
    # Check sites
    sites = db.query(Site).all()
    logger.info(f"Sites in database: {len(sites)}")
    for site in sites:
        products = db.query(Product).filter(Product.site_id == site.id).count()
        logger.info(f"- {site.name}: {products} products")

def main():
    try:
        logger.info("Starting system initialization...")
        
        # Initialize database
        init_database()
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Create superuser
            create_superuser(db)
            
            # Initialize sites and products
            init_sites(db)
            
            # Verify setup
            verify_setup(db)
            
            logger.info("\nSystem initialization completed successfully!")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error during initialization: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 