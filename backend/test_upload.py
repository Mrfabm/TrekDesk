import requests
import json
import time

try:
    # Login to get token
    login_url = "http://localhost:8000/api/auth/login"
    login_data = {
        "email": "admin@test.com",
        "password": "admin1123"
    }
    
    print("Attempting login...")
    login_response = requests.post(login_url, json=login_data)
    print(f"Login Status Code: {login_response.status_code}")
    print(f"Login Response: {login_response.text}")
    
    token = login_response.json()["access_token"]
    print(f"Got token: {token[:20]}...")

    # Upload passport
    upload_url = "http://localhost:8000/api/passport/upload"
    headers = {
        "Authorization": f"Bearer {token}"
    }

    print("\nAttempting file upload...")
    with open("test_passport.pdf", "rb") as f:
        files = [
            ("files", ("test_passport.pdf", f, "application/pdf"))
        ]
        response = requests.post(upload_url, headers=headers, files=files)
        print(f"Upload Status Code: {response.status_code}")
        print(f"Upload Response: {response.text}")
        
        if response.status_code == 200:
            uploaded_file = response.json()[0]
            if uploaded_file["status"] == "success":
                # Extract data from uploaded passport
                print("\nAttempting data extraction...")
                extract_url = "http://localhost:8000/api/passport/extract"
                extract_data = {
                    "file_paths": [uploaded_file["path"]]
                }
                extract_response = requests.post(extract_url, headers=headers, json=extract_data)
                print(f"Extract Status Code: {extract_response.status_code}")
                print(f"Extract Response: {extract_response.text}")

except Exception as e:
    print(f"Error occurred: {str(e)}") 