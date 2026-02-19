import json
import os
import google.generativeai as genai
from PIL import Image
from pdf2image import convert_from_path
import tempfile
import shutil
import logging
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoucherData(BaseModel):
    booking_name: str
    booking_reference: str
    trek_date: str
    head_of_file: str
    request_date: str
    product_type: str
    number_of_people: int
    agent_client: Optional[str] = None
    confidence_score: Optional[float] = None
    source_file: Optional[str] = None

    @validator('product_type')
    def validate_product_type(cls, v):
        valid_products = ['Mountain Gorillas', 'Golden Monkeys']
        if v not in valid_products:
            raise ValueError(f"Product type must be one of: {', '.join(valid_products)}")
        return v

    @validator('trek_date', 'request_date')
    def validate_dates(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError as e:
            raise ValueError(f"Invalid date format. Use YYYY-MM-DD: {str(e)}")

    @validator('number_of_people')
    def validate_number_of_people(cls, v):
        if not isinstance(v, int) or v <= 0:
            raise ValueError("Number of people must be a positive integer")
        return v

    @validator('booking_reference')
    def validate_booking_reference(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError("Booking reference must be at least 3 characters long")
        return v.strip().upper()

class VoucherExtractor:
    def __init__(self):
        self.supported_extensions = {'.jpg', '.jpeg', '.png', '.pdf', '.tiff'}
        self._temp_dir = None
        self.poppler_path = os.getenv('POPPLER_PATH')
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def __del__(self):
        if self._temp_dir:
            try:
                shutil.rmtree(self._temp_dir)
            except Exception:
                pass

    def load_image(self, image_path: str):
        """Load image for Gemini"""
        try:
            return Image.open(image_path)
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            raise

    def convert_pdf_to_image(self, pdf_path: str) -> str:
        """Convert first page of PDF to image and return path"""
        if not self._temp_dir:
            self._temp_dir = tempfile.mkdtemp()
            
        try:
            images = convert_from_path(
                pdf_path,
                dpi=300,
                first_page=1,
                last_page=1,
                poppler_path=self.poppler_path
            )
            
            if not images:
                raise ValueError("No images extracted from PDF")
            
            image_path = os.path.join(self._temp_dir, "voucher_page.jpg")
            images[0].save(image_path, 'JPEG')
            return image_path
        except Exception as e:
            logger.error(f"Error converting PDF: {e}")
            raise

    async def extract_data(self, file_path: str, source_file: Optional[str] = None) -> VoucherData:
        """Extract data from voucher image using Gemini Vision API"""
        try:
            # Convert PDF to image if needed
            if file_path.lower().endswith('.pdf'):
                image_path = self.convert_pdf_to_image(file_path)
            else:
                image_path = file_path

            # Load image
            image = self.load_image(image_path)

            # Prepare prompt for Gemini
            prompt = """Extract the following information from this voucher image:
            1. Booking Name (full name of the booking)
            2. Booking Reference (unique reference number)
            3. Trek Date (date of the trek/activity in YYYY-MM-DD format)
            4. Head of File (name after 'Booking made by')
            5. Request Date (date the booking was requested in YYYY-MM-DD format)
            6. Product Type (either 'Mountain Gorillas' or 'Golden Monkeys')
            7. Number of People/Permits (integer)

            Pay special attention to:
            - Date formats (convert all dates to YYYY-MM-DD)
            - Product type must be exactly 'Mountain Gorillas' or 'Golden Monkeys'
            - Number of people must be a positive integer
            - Booking reference should be in uppercase

            Return the data in JSON format with these exact keys:
            {
                "booking_name": "",
                "booking_reference": "",
                "trek_date": "YYYY-MM-DD",
                "head_of_file": "",
                "request_date": "YYYY-MM-DD",
                "product_type": "",
                "number_of_people": 0
            }

            If you cannot extract a field with high confidence, leave it as an empty string or 0 for numbers."""

            # Generate response from Gemini
            response = self.model.generate_content([prompt, image])

            if not response or not response.text:
                raise ValueError("No response from Gemini API")

            # Parse response
            try:
                # Extract JSON from response
                json_str = response.text
                # Find JSON object in the response
                json_start = json_str.find('{')
                json_end = json_str.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = json_str[json_start:json_end]
                    data = json.loads(json_str)
                else:
                    raise ValueError("No valid JSON found in response")

                # Add derived fields
                data['agent_client'] = data['booking_reference'][:3] if data['booking_reference'] else ''
                data['confidence_score'] = 0.95  # High confidence with Gemini
                data['source_file'] = source_file

                # Create VoucherData object
                voucher_data = VoucherData(**data)
                return voucher_data

            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON response: {e}")
                raise ValueError("Invalid JSON response from API")
            except Exception as e:
                logger.error(f"Error processing extracted data: {e}")
                raise

        except Exception as e:
            logger.error(f"Error extracting voucher data from {source_file}: {str(e)}")
            
            # Provide more user-friendly error messages
            error_msg = str(e)
            if "Invalid date format" in error_msg:
                error_msg = "Could not read the date format correctly. Please ensure dates are clearly visible."
            elif "Product type must be" in error_msg:
                error_msg = "Could not determine the product type. Please ensure it is clearly marked as 'Mountain Gorillas' or 'Golden Monkeys'."
            elif "Number of people must be" in error_msg:
                error_msg = "Could not determine the number of people. Please ensure it is clearly visible."
            elif "Could not convert PDF" in error_msg:
                error_msg = "Could not process the PDF file. Please ensure it is a valid voucher scan."
            
            raise ValueError(error_msg) from e

def extract_voucher_data(file_path: str) -> dict:
    """Helper function to extract data from a voucher file"""
    try:
        extractor = VoucherExtractor()
        data = asyncio.run(extractor.extract_data(file_path, file_path))
        return data.model_dump()
    except Exception as e:
        logger.error(f"Error in extract_voucher_data: {e}")
        raise 