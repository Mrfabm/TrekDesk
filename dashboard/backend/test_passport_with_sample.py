import asyncio
import aiohttp
import os
from app.utils.passport_extractor import PassportExtractor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def download_sample_passport():
    """Download a sample passport image for testing"""
    # Using a sample passport image URL (this is a public domain sample)
    sample_url = "https://www.consilium.europa.eu/prado/images/158136.JPG"
    
    test_dir = "test_data/passports"
    os.makedirs(test_dir, exist_ok=True)
    file_path = os.path.join(test_dir, "sample_passport.jpg")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(sample_url) as response:
                if response.status == 200:
                    with open(file_path, 'wb') as f:
                        f.write(await response.read())
                    logger.info(f"Downloaded sample passport to {file_path}")
                    return file_path
                else:
                    logger.error(f"Failed to download sample: {response.status}")
                    return None
    except Exception as e:
        logger.error(f"Error downloading sample: {str(e)}")
        return None

async def test_extraction():
    try:
        # Download sample passport
        sample_path = await download_sample_passport()
        if not sample_path:
            logger.error("Could not download sample passport")
            return
            
        # Initialize extractor
        extractor = PassportExtractor()
        
        # Extract data
        logger.info(f"\nProcessing: {sample_path}")
        try:
            passport_data = await extractor.extract_data(sample_path)
            
            # Print results
            logger.info("Extraction Results:")
            logger.info(f"Full Name: {passport_data.full_name}")
            logger.info(f"Date of Birth: {passport_data.date_of_birth}")
            logger.info(f"Passport Number: {passport_data.passport_number}")
            logger.info(f"Passport Expiry: {passport_data.passport_expiry}")
            logger.info(f"Nationality: {passport_data.nationality}")
            logger.info(f"Place of Birth: {passport_data.place_of_birth}")
            logger.info(f"Gender: {passport_data.gender}")
            logger.info(f"Confidence Score: {passport_data.confidence_score}")
            
            # Validate extraction
            is_valid, missing_fields = PassportExtractor.validate_extracted_data(passport_data)
            if is_valid:
                logger.info("✅ All required fields extracted successfully")
            else:
                logger.warning(f"❌ Missing or invalid fields: {', '.join(missing_fields)}")
                
        except Exception as e:
            logger.error(f"Error processing passport: {str(e)}")
                
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_extraction()) 