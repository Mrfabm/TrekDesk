from typing import Optional, List, Dict
from datetime import date, datetime
from pydantic import BaseModel, validator
import os
from dotenv import load_dotenv
import re
import logging
from pathlib import Path
import base64
from pdf2image import convert_from_path
import tempfile
import shutil
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

class PassportData(BaseModel):
    full_name: str
    date_of_birth: str
    passport_number: str
    passport_expiry: str
    nationality: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[str] = None
    confidence_score: Optional[float] = None
    source_file: Optional[str] = None

    @validator('full_name')
    def validate_full_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Full name must be at least 2 characters long")
        return ' '.join(word.capitalize() for word in v.strip().split())

    @validator('passport_number')
    def validate_passport_number(cls, v):
        v = ''.join(v.split())
        if not re.match(r'^[A-Z0-9]{6,12}$', v):
            raise ValueError("Invalid passport number format")
        return v

    @validator('date_of_birth', 'passport_expiry')
    def validate_dates(cls, v):
        try:
            # Convert string to date for validation
            date_obj = datetime.strptime(v, "%Y-%m-%d").date()
            today = datetime.now().date()
            
            if date_obj > today and v == 'date_of_birth':
                raise ValueError("Date of birth cannot be in the future")
                
            return v  # Return original string if valid
        except ValueError as e:
            raise ValueError(f"Invalid date format. Use YYYY-MM-DD: {str(e)}")

    @validator('gender')
    def validate_gender(cls, v):
        if v:
            v = v.upper()
            if v not in ['M', 'F', 'X']:
                raise ValueError("Gender must be M, F, or X")
        return v

class PassportExtractor:
    def __init__(self):
        self.supported_extensions = {'.jpg', '.jpeg', '.png', '.pdf', '.tiff'}
        self.extraction_results: Dict[str, PassportData] = {}
        self.poppler_path = os.getenv('POPPLER_PATH')
        self._temp_dir = None

    def __del__(self):
        if self._temp_dir:
            try:
                shutil.rmtree(self._temp_dir)
            except Exception:
                pass

    def load_image(self, image_path: str):
        """Load image for Gemini"""
        from PIL import Image
        return Image.open(image_path)

    def convert_pdf_to_image(self, pdf_path: str) -> str:
        """Convert first page of PDF to image and return the image path"""
        if not self._temp_dir:
            self._temp_dir = tempfile.mkdtemp()
            
        # Convert PDF to image
        images = convert_from_path(
            pdf_path, 
            dpi=300, 
            first_page=1, 
            last_page=1,
            poppler_path=self.poppler_path
        )
        
        if not images:
            raise ValueError("Could not convert PDF to image")
        
        # Save first page as image
        image_path = os.path.join(self._temp_dir, "passport_page.jpg")
        images[0].save(image_path, 'JPEG')
        return image_path

    async def extract_data(self, file_path: str, source_file: Optional[str] = None) -> PassportData:
        """Extract passport data using Gemini Pro Vision"""
        try:
            # If file is PDF, convert to image first
            if file_path.lower().endswith('.pdf'):
                image_path = self.convert_pdf_to_image(file_path)
            else:
                image_path = file_path
            
            # Load image
            image = self.load_image(image_path)
            
            # Prepare prompt for Gemini
            prompt = """Extract the following information from this passport image:
            - Full name
            - Date of birth (in YYYY-MM-DD format)
            - Passport number
            - Passport expiry date (in YYYY-MM-DD format)
            - Nationality
            - Place of birth
            - Gender (M/F/X)
            
            Pay special attention to:
            - MRZ (Machine Readable Zone) lines at the bottom of passports
            - Different date formats (convert to YYYY-MM-DD)
            - Name variations and formats
            - Passport number format
            
            Return the data in JSON format with these exact keys:
            {
                "full_name": "",
                "date_of_birth": "",
                "passport_number": "",
                "passport_expiry": "",
                "nationality": "",
                "place_of_birth": "",
                "gender": ""
            }
            
            If you cannot extract a field with high confidence, leave it as an empty string."""

            # Generate response from Gemini
            response = model.generate_content([prompt, image])
            
            # Parse the response
            import json
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
                
                # Create PassportData object
                passport_data = PassportData(
                    full_name=data.get('full_name', ''),
                    date_of_birth=data.get('date_of_birth', ''),
                    passport_number=data.get('passport_number', ''),
                    passport_expiry=data.get('passport_expiry', ''),
                    nationality=data.get('nationality', ''),
                    place_of_birth=data.get('place_of_birth', ''),
                    gender=data.get('gender', ''),
                    confidence_score=0.95,  # High confidence with Gemini
                    source_file=source_file
                )
                
                # Store result
                if source_file:
                    self.extraction_results[source_file] = passport_data
                
                return passport_data

            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse Gemini response: {str(e)}")

        except Exception as e:
            logger.error(f"Error extracting passport data from {source_file}: {str(e)}")
            
            # Provide more user-friendly error messages
            error_msg = str(e)
            if "Invalid date format" in error_msg:
                error_msg = "Could not read the date format correctly. Please ensure dates are clearly visible."
            elif "Invalid passport number format" in error_msg:
                error_msg = "Could not read the passport number correctly. Please ensure it is clearly visible."
            elif "Full name must be" in error_msg:
                error_msg = "Could not read the full name correctly. Please ensure it is clearly visible."
            elif "Could not convert PDF" in error_msg:
                error_msg = "Could not process the PDF file. Please ensure it is a valid passport scan."
            
            raise ValueError(error_msg) from e

    async def process_multiple_files(self, file_paths: List[str]) -> Dict[str, PassportData]:
        """Process multiple passport files and return extracted data for each"""
        results = {}
        for file_path in file_paths:
            path = Path(file_path)
            if path.suffix.lower() not in self.supported_extensions:
                logger.warning(f"Unsupported file type: {file_path}")
                continue
                
            try:
                passport_data = await self.extract_data(str(path), str(path))
                results[str(path)] = passport_data
                logger.info(f"Successfully processed {path}")
                
            except Exception as e:
                logger.error(f"Failed to process {path}: {str(e)}")
                continue
        
        return results

    def get_extraction_results(self) -> Dict[str, PassportData]:
        """Return all extraction results"""
        return self.extraction_results

    def clear_results(self):
        """Clear all stored extraction results"""
        self.extraction_results.clear()

    @staticmethod
    def validate_extracted_data(data: PassportData) -> tuple[bool, list[str]]:
        """Validate the extracted data and return a list of any missing or invalid fields"""
        missing_fields = []
        
        if not data.full_name or len(data.full_name.strip()) < 2:
            missing_fields.append("full_name")
        if not data.passport_number or not re.match(r'^[A-Z0-9]{6,12}$', data.passport_number):
            missing_fields.append("passport_number")
            
        today = datetime.now().date()
        try:
            dob = datetime.strptime(data.date_of_birth, "%Y-%m-%d").date()
            if not data.date_of_birth or dob > today:
                missing_fields.append("date_of_birth")
        except (ValueError, TypeError):
            missing_fields.append("date_of_birth")
            
        try:
            expiry = datetime.strptime(data.passport_expiry, "%Y-%m-%d").date()
            if not data.passport_expiry or expiry < today:
                missing_fields.append("passport_expiry")
        except (ValueError, TypeError):
            missing_fields.append("passport_expiry")
            
        return len(missing_fields) == 0, missing_fields 