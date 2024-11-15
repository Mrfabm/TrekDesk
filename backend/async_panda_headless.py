import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import random
from plyer import notification
import requests

# List of user agents
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
]

def generate_dates(start_date, num_days):
    return [(start_date + timedelta(days=i)).strftime("%d/%m/%Y") for i in range(num_days)]

def random_delay(min_delay=0.5, max_delay=3):
    return random.uniform(min_delay, max_delay)

async def process_date(page, date):
    try:
        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_site"]', timeout=20000)
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_site"]', label='Volcanoes National Park')

        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_product"]', timeout=20000)
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_product"]', label='Mountain gorillas')

        await asyncio.sleep(random_delay())
        date_input = page.locator('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]')

        await asyncio.sleep(random_delay())
        await date_input.fill(date)
        await page.press('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]', 'Tab')

        await asyncio.sleep(random_delay())
        await page.wait_for_selector('//input[@id="form:visitorAndCategoryDetails_slots"]', timeout=20000)

        input_value = await page.input_value('//input[@id="form:visitorAndCategoryDetails_slots"]')
        if not input_value:
            return {"Date": date, "Attendance": "Sold Out"}
        else:
            return {"Date": date, "Attendance": input_value}

    except Exception as e:
        print(f"Error processing {date}: {e}")
        return None

async def retry_date_in_new_tab(context, date):
    try:
        page = await context.new_page()
        page_url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
        await page.goto(page_url)
        result = await process_date(page, date)
        await page.close()
        return result
    except Exception as e:
        print(f"Error retrying {date}: {e}")
        return None

async def process_dates_in_tab(context, dates):
    page = await context.new_page()
    results = []
    page_url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
    await page.goto(page_url)
    
    for date in dates:
        result = await process_date(page, date)
        if result is None:
            retry_result = await retry_date_in_new_tab(context, date)
            if retry_result:
                results.append(retry_result)
        else:
            results.append(result)
    
    await page.close()
    return results

def get_auth_token():
    try:
        response = requests.post(
            'http://localhost:8000/api/auth/login',
            json={
                "email": "admin@example.com",
                "password": "admin123"
            }
        )
        if response.ok:
            return response.json()['access_token']
        return None
    except Exception as e:
        print(f"Error getting auth token: {e}")
        return None

async def main():
    day_after_tomorrow = datetime.now() + timedelta(days=12)
    num_days = 80
    num_tabs = 10
    dates = generate_dates(day_after_tomorrow, num_days)
    date_batches = [dates[i::num_tabs] for i in range(num_tabs)]

    async with async_playwright() as p:
        user_agent = random.choice(USER_AGENTS)
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=user_agent)

        tasks = [process_dates_in_tab(context, batch) for batch in date_batches]
        all_results = await asyncio.gather(*tasks)
        await browser.close()

    # Flatten results and remove None values
    results = [item for sublist in all_results for item in sublist if item is not None]
    
    # Sort results by date
    results.sort(key=lambda x: datetime.strptime(x['Date'], "%d/%m/%Y"))

    # Get auth token and save to database
    token = get_auth_token()
    if not token:
        print("Failed to get authentication token")
        return

    try:
        response = requests.post(
            'http://localhost:8000/api/available-slots',
            json=results,
            headers={
                'Authorization': f'Bearer {token}'
            }
        )
        if response.ok:
            print("Successfully saved slots data to database")
            
            # Show notifications
            for result in results:
                notification.notify(
                    title=f'Slots for {result["Date"]}',
                    message=f'Available: {result["Attendance"]}',
                    app_name='Slot Checker',
                    timeout=5
                )
        else:
            print("Failed to save slots data to database")
    except Exception as e:
        print(f"Error saving to database: {e}")

if __name__ == "__main__":
    asyncio.run(main())