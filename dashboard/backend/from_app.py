import asyncio
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import pandas as pd
import random
from plyer import notification

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
        # Wait for the necessary elements to be available
        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_site"]', timeout=20000)  # Ensure dropdowns are loaded
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_site"]', label='Volcanoes National Park')

        await page.wait_for_selector('//select[@id="form:visitorAndCategoryDetails_product"]', timeout=20000)
        await asyncio.sleep(random_delay())
        await page.select_option('//select[@id="form:visitorAndCategoryDetails_product"]', label='Mountain gorillas')

        await asyncio.sleep(random_delay())
        date_input = page.locator('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]')

        # Random delay
        await asyncio.sleep(random_delay())

        # Fill the date input and confirm
        await date_input.fill(date)
        await page.press('//input[@id="form:visitorAndCategoryDetails_dateOfVisit"]', 'Tab')

        # Random delay
        await asyncio.sleep(random_delay())

        # Wait for the result to be visible
        await page.wait_for_selector('//input[@id="form:visitorAndCategoryDetails_slots"]', timeout=20000)

        # Retrieve the value
        input_value = await page.input_value('//input[@id="form:visitorAndCategoryDetails_slots"]')
        
        if not input_value:
            return date, "Sold Out"
        else:
            return date, input_value

    except Exception as e:
        # print(f"Processing on {date} ...")
        # return None  # Return None to indicate failure and retry in a new tab
        pass

async def retry_date_in_new_tab(context, date):
    try:
        page = await context.new_page()
        page_url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
        await page.goto(page_url)
        result = await process_date(page, date)
        await page.close()
        # if result is None:
        #     # return date, "Still Processing..."
        #     pass 
        # else:
        return result
    except Exception as e:
        # print(f"Processing on {date}...")
        # return date, "Still processing..."
        pass

async def process_dates_in_tab(context, dates):
    page = await context.new_page()
    results = []
    page_url = "https://visitrwandabookings.rdb.rw/rdbBooking/tourismpermit_v1/TourismPermit_v1.xhtml"
    await page.goto(page_url)
    for date in dates:
        result = await process_date(page, date)
        if result is None:  # If an error occurred, retry in a new tab
            retry_result = await retry_date_in_new_tab(context, date)
            results.append(retry_result)
        else:
            results.append(result)
    await page.close()
    return results

async def main():
    day_after_tomorrow = datetime.now() + timedelta(days=12)
    num_days = 80  # Number of days to cover
    num_tabs = 10  # Number of tabs to open
    dates = generate_dates(day_after_tomorrow, num_days)

    # Divide dates into batches for each tab
    date_batches = [dates[i::num_tabs] for i in range(num_tabs)]

    async with async_playwright() as p:
        user_agent = random.choice(USER_AGENTS)  # Choose a random user agent
        browser = await p.chromium.launch(headless=True)  # Headless mode to run without displaying UI
        context = await browser.new_context(user_agent=user_agent)

        # Create tasks for each batch of dates to process in parallel
        tasks = [process_dates_in_tab(context, batch) for batch in date_batches]
        all_results = await asyncio.gather(*tasks)

        await browser.close()

    # Flatten the results list
    results = [item for sublist in all_results for item in sublist]

      # Sort results by date
    results.sort(key=lambda x: datetime.strptime(x[0], "%d/%m/%Y"))

    # Create a DataFrame from the results
    df = pd.DataFrame(results, columns=['Date', 'Attendance'])
    
    # Convert the 'Date' column to datetime for sorting
    df['Date'] = pd.to_datetime(df['Date'], format="%d/%m/%Y")

    # Sort the DataFrame by the 'Date' column
    df = df.sort_values(by='Date')

    # Convert the 'Date' column back to string format if needed
    df['Date'] = df['Date'].dt.strftime("%d/%m/%Y")

    # Reset the index of the DataFrame
    df = df.reset_index(drop=True)

    # Set display option to show 100 rows
    pd.set_option('display.max_rows', 100)

    # Print the sorted DataFrame
    print("\n\n===== Gorilla Permits Slots=====\n\n")
    print(df)


    for index, row in df.iterrows():
        notification.notify(
            title=f'Attendance for {row["Date"]}',
            message=f'Attendance: {row["Attendance"]}',
            app_name='Attendance Scraper',
            timeout=5  # Duration in seconds
        )

if __name__ == "__main__":
    asyncio.run(main())