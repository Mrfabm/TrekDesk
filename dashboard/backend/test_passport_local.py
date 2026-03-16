import asyncio
from app.utils.passport_extractor import PassportExtractor
import os
import logging
from PIL import Image, ImageDraw, ImageFont

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sample_passport():
    """Create a simple sample passport image for testing"""
    test_dir = "test_data/passports"
    os.makedirs(test_dir, exist_ok=True)
    file_path = os.path.join(test_dir, "sample_passport.jpg")
    
    # Create a new image with a white background
    width = 1000
    height = 700
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Add some sample passport data
    text_color = 'black'
    sample_data = [
        "PASSPORT / PASSEPORT",
        "Surname / Nom: SMITH",
        "Given Names / Prénoms: JOHN JAMES",
        "Nationality / Nationalité: BRITISH",
        "Date of Birth / Date de naissance: 15 JAN 1980",
        "Place of Birth / Lieu de naissance: LONDON",
        "Sex / Sexe: M",
        "Date of Issue / Date de délivrance: 01 JAN 2020",
        "Date of Expiry / Date d'expiration: 01 JAN 2030",
        "Passport No. / No. du passeport: AB123456",
        "",
        "P<GBRSMITH<<JOHN<JAMES<<<<<<<<<<<<<<<<<<<<<<",
        "AB123456<7GBR8001159M3001017<<<<<<<<<<<<<<02"
    ]
    
    y_position = 50
    for line in sample_data:
        draw.text((50, y_position), line, fill=text_color)
        y_position += 40
    
    # Save the image
    image.save(file_path, 'JPEG')
    logger.info(f"Created sample passport at {file_path}")
    return file_path

async def test_extraction():
    try:
        # Create sample passport
        sample_path = create_sample_passport()
            
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