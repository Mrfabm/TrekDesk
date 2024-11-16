from playwright.sync_api import sync_playwright

def check_installation():
    try:
        with sync_playwright() as p:
            print('Checking Playwright installation...')
            
            # Check if Chromium is installed
            chromium_path = p.chromium.executable_path
            if chromium_path:
                print(f'✓ Chromium is installed at: {chromium_path}')
            else:
                print('✗ Chromium is not installed')
                print('Try running: playwright install chromium')
            
            # Try launching browser
            print('\nTesting browser launch...')
            browser = p.chromium.launch()
            print('✓ Successfully launched browser')
            
            # Try creating a page
            page = browser.new_page()
            print('✓ Successfully created page')
            
            # Try navigating to a test URL
            print('\nTesting page navigation...')
            page.goto('https://example.com')
            print('✓ Successfully navigated to test page')
            
            # Clean up
            browser.close()
            print('\nAll tests passed! Playwright is working correctly.')
            
    except Exception as e:
        print(f'\n✗ Error during testing: {e}')
        print('\nTry these steps to fix:')
        print('1. Run: playwright install')
        print('2. Run: playwright install chromium')
        print('3. Make sure Microsoft Visual C++ Redistributable is installed')

if __name__ == "__main__":
    check_installation() 