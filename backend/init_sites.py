from app.database import SessionLocal
from app.models.site import Site, Product

def init_sites():
    db = SessionLocal()
    try:
        # Check if sites already exist
        if db.query(Site).first():
            print("Sites already initialized")
            return

        # Create Volcanoes National Park site
        volcanoes = Site(name="Volcanoes National Park")
        db.add(volcanoes)
        db.commit()
        db.refresh(volcanoes)

        # Create Volcanoes National Park products with unit costs
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

        # Create Nyungwe Forest National Park site
        nyungwe = Site(name="Nyungwe Forest National Park")
        db.add(nyungwe)
        db.commit()
        db.refresh(nyungwe)

        # Create Nyungwe Forest National Park products with unit costs
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
            ("Porter", 15),
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
        print("Sites and products initialized successfully")
    except Exception as e:
        print(f"Error initializing sites: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_sites() 