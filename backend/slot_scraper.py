import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import time
from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
from app.models.scrape_status import ScrapeStatus

def generate_dates(start_date, num_days=60):
    """Generate dates for the next num_days"""
    return [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(num_days)]

def scrape_slots():
    """Scrape slots data and save to database"""
    try:
        # Create database session
        db = SessionLocal()
        
        # Create status record
        status = ScrapeStatus(
            status="running",
            message="Starting scrape",
            last_run=datetime.utcnow()
        )
        db.add(status)
        db.commit()

        # Session for maintaining cookies
        session = requests.Session()
        
        # Initial form load to get cookies/tokens
        url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # Get dates to check
        start_date = datetime.now() + timedelta(days=12)  # Start from day after tomorrow
        dates = generate_dates(start_date)
        
        results = []
        for date in dates:
            try:
                # Form data for each request
                data = {
                    'form': 'form',
                    'form:visitorAndCategoryDetails_site': 'Volcanoes National Park',
                    'form:visitorAndCategoryDetails_product': 'Mountain gorillas',
                    'form:visitorAndCategoryDetails_dateOfVisit': date,
                    # Add any other required form fields
                }
                
                # Make request
                response = session.post(url, headers=headers, data=data)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'lxml')
                    
                    # Find slots input field
                    slots_input = soup.find('input', {'id': 'form:visitorAndCategoryDetails_slots'})
                    slots = slots_input.get('value', 'Sold Out') if slots_input else 'Sold Out'
                    
                    results.append({
                        'date': date,
                        'slots': slots
                    })
                    
                    # Save to database
                    existing_slot = db.query(AvailableSlot).filter(
                        AvailableSlot.date == date
                    ).first()
                    
                    if existing_slot:
                        existing_slot.slots = slots
                        existing_slot.updated_at = datetime.utcnow()
                    else:
                        new_slot = AvailableSlot(
                            date=date,
                            slots=slots
                        )
                        db.add(new_slot)
                    
                    db.commit()
                    
                    # Small delay between requests
                    time.sleep(0.5)
                
            except Exception as e:
                print(f"Error processing date {date}: {e}")
                continue
        
        # Update status
        status.status = "success"
        status.message = f"Successfully scraped {len(results)} dates"
        db.commit()
        
        return results
        
    except Exception as e:
        if 'status' in locals():
            status.status = "failed"
            status.message = str(e)
            db.commit()
        print(f"Scraping error: {e}")
        raise
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    scrape_slots() 