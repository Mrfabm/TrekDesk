import pytest
from app.utils.passport_extractor import PassportExtractor, PassportData
import os
from datetime import datetime

@pytest.mark.asyncio
async def test_passport_extraction():
    # Initialize extractor
    extractor = PassportExtractor()
    
    # Test file path
    test_file = os.path.join(os.path.dirname(__file__), "test_data/sample_passport.txt")
    
    # Ensure file exists
    assert os.path.exists(test_file), "Test file not found"
    
    try:
        # Read test file
        with open(test_file, 'r') as f:
            text = f.read()
        
        # Extract data
        passport_data = await extractor.extract_data(text, test_file)
        
        # Validate extracted data
        assert isinstance(passport_data, PassportData), "Invalid return type"
        assert passport_data.full_name == "John Michael Smith", "Invalid name extraction"
        assert passport_data.passport_number == "AB1234567", "Invalid passport number"
        assert passport_data.nationality == "USA", "Invalid nationality"
        assert passport_data.gender == "M", "Invalid gender"
        
        # Validate dates
        dob = datetime.strptime(passport_data.date_of_birth, "%Y-%m-%d").date()
        expiry = datetime.strptime(passport_data.passport_expiry, "%Y-%m-%d").date()
        
        assert dob.year == 1980, "Invalid birth year"
        assert dob.month == 1, "Invalid birth month"
        assert dob.day == 15, "Invalid birth day"
        
        assert expiry.year == 2030, "Invalid expiry year"
        assert expiry.month == 1, "Invalid expiry month"
        assert expiry.day == 1, "Invalid expiry day"
        
    except Exception as e:
        pytest.fail(f"Passport extraction failed: {str(e)}")

@pytest.mark.asyncio
async def test_multiple_files():
    extractor = PassportExtractor()
    test_file = os.path.join(os.path.dirname(__file__), "test_data/sample_passport.txt")
    test_files = [test_file]
    
    try:
        results = await extractor.process_multiple_files(test_files)
        
        assert len(results) == 1, "Should process one file"
        assert isinstance(results[test_file], PassportData), "Invalid result type"
        
        # Validate first result
        passport_data = results[test_file]
        assert passport_data.full_name == "John Michael Smith", "Invalid name in batch processing"
        assert passport_data.passport_number == "AB1234567", "Invalid passport number in batch processing"
        
    except Exception as e:
        pytest.fail(f"Multiple file processing failed: {str(e)}")

def test_data_validation():
    # Test valid passport data
    valid_data = PassportData(
        full_name="John Smith",
        date_of_birth="1980-01-15",
        passport_number="AB1234567",
        passport_expiry="2030-01-01",
        nationality="USA",
        gender="M"
    )
    
    is_valid, missing = PassportExtractor.validate_extracted_data(valid_data)
    assert is_valid, "Valid data marked as invalid"
    assert len(missing) == 0, "Valid data has missing fields"
    
    # Test invalid passport data
    invalid_data = PassportData(
        full_name="",  # Invalid: empty name
        date_of_birth="2025-01-01",  # Invalid: future date
        passport_number="123",  # Invalid: too short
        passport_expiry="2020-01-01",  # Invalid: expired
        nationality="USA",
        gender="M"
    )
    
    is_valid, missing = PassportExtractor.validate_extracted_data(invalid_data)
    assert not is_valid, "Invalid data marked as valid"
    assert len(missing) > 0, "Invalid data should have missing/invalid fields" 