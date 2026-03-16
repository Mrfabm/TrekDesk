import pytest
from fastapi.testclient import TestClient
import os
from datetime import date
import jwt
from app.utils.auth import SECRET_KEY, ALGORITHM

def create_test_token(user_id: int = 1):
    """Create a test JWT token"""
    token_data = {
        "sub": str(user_id),
        "exp": 9999999999  # Far future expiry
    }
    return jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

def test_upload_endpoint(test_client):
    token = create_test_token()
    test_file = os.path.join(os.path.dirname(__file__), "test_data/test_passport.png")
    
    # Create test file if it doesn't exist
    if not os.path.exists(test_file):
        from PIL import Image
        img = Image.new('RGB', (300, 100), color='white')
        img.save(test_file)
    
    try:
        with open(test_file, "rb") as f:
            files = {"files": ("test_passport.png", f, "image/png")}
            response = test_client.post(
                "/api/passport/upload",
                headers={"Authorization": f"Bearer {token}"},
                files=files
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert len(data) > 0, "No upload results returned"
        assert data[0]["status"] == "success", f"Upload was not successful: {data[0].get('error', '')}"
        assert "path" in data[0], "No file path in response"
    
    finally:
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

def test_extract_endpoint(test_client):
    token = create_test_token()
    test_file = os.path.join(os.path.dirname(__file__), "test_data/test_passport.png")
    
    # Create test file
    if not os.path.exists(test_file):
        from PIL import Image
        img = Image.new('RGB', (300, 100), color='white')
        img.save(test_file)
    
    try:
        response = test_client.post(
            "/api/passport/extract",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"file_paths": [test_file]}
        )
        
        assert response.status_code == 200, f"Extraction failed: {response.text}"
        data = response.json()
        assert test_file in data, "No results for test file"
        assert data[test_file]["status"] in ["complete", "incomplete"], "Invalid extraction status"
        
        if data[test_file]["status"] == "complete":
            extracted = data[test_file]["data"]
            assert "full_name" in extracted, "No name extracted"
            assert "passport_number" in extracted, "No passport number extracted"
    
    finally:
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

def test_create_passport(test_client):
    token = create_test_token()
    passport_data = {
        "full_name": "John Smith",
        "date_of_birth": "1980-01-15",
        "passport_number": "AB1234567",
        "passport_expiry": "2030-01-01"
    }
    
    response = test_client.post(
        "/api/passport",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=passport_data
    )
    
    assert response.status_code == 200, f"Failed to create passport: {response.text}"
    data = response.json()
    assert data["passport_number"] == passport_data["passport_number"], "Passport number mismatch"
    assert data["full_name"] == passport_data["full_name"], "Name mismatch"

def test_get_passports(test_client):
    token = create_test_token()
    
    response = test_client.get(
        "/api/passport",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200, f"Failed to get passports: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response is not a list"
    
    if len(data) > 0:
        passport = data[0]
        assert "passport_number" in passport, "No passport number in response"
        assert "full_name" in passport, "No name in response" 