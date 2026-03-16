from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime, timedelta
import time
from app.database import SessionLocal
from app.models.available_slots import AvailableSlot
from app.models.scrape_status import ScrapeStatus

def generate_dates(start_date, num_days=60):
    return [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(num_days)]

async def scrape_slots():
    """Scrape slots data and save to database"""
    db = SessionLocal()
    try:
        # Create status record
        status = ScrapeStatus(
            status="running",
            message="Starting scrape",
            last_run=datetime.utcnow()
        )
        db.add(status)
        db.commit()

        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        # Initialize driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        try:
            # Initial page load
            url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
            driver.get(url)
            
            # Get dates to check
            start_date = datetime.now() + timedelta(days=12)
            dates = generate_dates(start_date)
            
            results = []
            for date in dates:
                try:
                    # Wait for and select site
                    site_select = WebDriverWait(driver, 20).until(
                        EC.presence_of_element_located((By.ID, "form:visitorAndCategoryDetails_site"))
                    )
                    site_select.send_keys("Volcanoes National Park")
                    time.sleep(1)

                    # Select product
                    product_select = driver.find_element(By.ID, "form:visitorAndCategoryDetails_product")
                    product_select.send_keys("Mountain gorillas")
                    time.sleep(1)

                    # Fill date
                    date_input = driver.find_element(By.ID, "form:visitorAndCategoryDetails_dateOfVisit")
                    date_input.clear()
                    date_input.send_keys(date)
                    time.sleep(1)

                    # Get slots
                    slots_input = WebDriverWait(driver, 20).until(
                        EC.presence_of_element_located((By.ID, "form:visitorAndCategoryDetails_slots"))
                    )
                    slots = slots_input.get_attribute("value") or "Sold Out"

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
                    results.append({"Date": date, "Attendance": slots})
                    print(f"Processed {date}: {slots}")

                    # Refresh page for next date
                    driver.refresh()
                    time.sleep(2)

                except Exception as e:
                    print(f"Error processing date {date}: {e}")
                    driver.refresh()
                    time.sleep(2)
                    continue

            # Update status
            status.status = "success"
            status.message = f"Successfully scraped {len(results)} dates"
            db.commit()
            
            return results

        finally:
            driver.quit()

    except Exception as e:
        if 'status' in locals():
            status.status = "failed"
            status.message = str(e)
            db.commit()
        print(f"Scraping error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(scrape_slots()) 