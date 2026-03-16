from app.database import SessionLocal, engine
from app.models import Base, Site, Product
from sqlalchemy import text

def reset_tables():
    db = SessionLocal()
    try:
        # Clear and reset site/product data
        db.execute(text('TRUNCATE TABLE products CASCADE;'))
        db.execute(text('TRUNCATE TABLE sites CASCADE;'))
        
        # Reset sequences
        db.execute(text('ALTER SEQUENCE products_id_seq RESTART WITH 1;'))
        db.execute(text('ALTER SEQUENCE sites_id_seq RESTART WITH 1;'))
        
        # Re-initialize sites and products
        volcanoes = Site(name="Volcanoes National Park")
        db.add(volcanoes)
        db.flush()  # Get ID before adding products
        
        products = [
            Product(name="Mountain Gorillas", site_id=volcanoes.id, unit_cost=1500),
            Product(name="Golden Monkeys", site_id=volcanoes.id, unit_cost=100)
        ]
        db.bulk_save_objects(products)
        
        db.commit()
        print("Tables reset successfully!")
    except Exception as e:
        print(f"Error resetting tables: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_tables() 