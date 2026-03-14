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
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables using absolute path so it works regardless of working directory
_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(_ENV_PATH)

_OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not _OPENAI_KEY:
    raise RuntimeError(f"OPENAI_API_KEY not found. Looked for .env at: {_ENV_PATH}")

client = OpenAI(api_key=_OPENAI_KEY)


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
        v = ''.join(c for c in v.upper() if c.isalnum())
        if v and not re.match(r'^[A-Z0-9]{4,20}$', v):
            raise ValueError("Invalid passport number format")
        return v

    @validator('date_of_birth', 'passport_expiry')
    def validate_dates(cls, v):
        if not v:
            return v
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
            try:
                datetime.strptime(v, fmt)
                return v
            except ValueError:
                continue
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD: {v}")

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

    def _encode_image(self, image_path: str) -> str:
        """Encode image as base64 string for OpenAI API."""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def convert_pdf_to_image(self, pdf_path: str) -> str:
        """Convert first page of PDF to image and return the image path."""
        if not self._temp_dir:
            self._temp_dir = tempfile.mkdtemp()

        images = convert_from_path(
            pdf_path,
            dpi=300,
            first_page=1,
            last_page=1,
            poppler_path=self.poppler_path
        )

        if not images:
            raise ValueError("Could not convert PDF to image")

        image_path = os.path.join(self._temp_dir, "passport_page.jpg")
        images[0].save(image_path, 'JPEG')
        return image_path

    @staticmethod
    def _normalize_date(date_str: str) -> str:
        """Try multiple date formats and return YYYY-MM-DD, or original string."""
        if not date_str:
            return ''
        date_str = date_str.strip()
        formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d',
            '%d %b %Y', '%d %B %Y', '%b %d %Y', '%B %d %Y',
            '%d%b%Y', '%d%B%Y',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        return date_str

    @staticmethod
    def _normalize_passport_number(raw: str) -> str:
        """Strip spaces/dashes/dots and uppercase."""
        return ''.join(c for c in raw.upper() if c.isalnum())

    async def extract_data(self, file_path: str, source_file: Optional[str] = None) -> PassportData:
        """Extract passport data using GPT-4o Vision."""
        import json

        if file_path.lower().endswith('.pdf'):
            image_path = self.convert_pdf_to_image(file_path)
        else:
            image_path = file_path

        image_b64 = self._encode_image(image_path)

        prompt = """Extract the following information from this passport image.
Pay special attention to the MRZ (Machine Readable Zone) lines at the bottom.

Return ONLY a JSON object with these exact keys (no extra text):
{
    "full_name": "",
    "date_of_birth": "YYYY-MM-DD",
    "passport_number": "",
    "passport_expiry": "YYYY-MM-DD",
    "nationality": "",
    "place_of_birth": "",
    "gender": "M or F"
}

Rules:
- Convert ALL dates to YYYY-MM-DD format
- Passport number: alphanumeric only, no spaces or dashes
- If a field cannot be read confidently, leave it as an empty string"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )

        text = response.choices[0].message.content
        if not text:
            raise ValueError("No response from OpenAI API")

        json_start = text.find('{')
        json_end = text.rfind('}') + 1
        if json_start < 0 or json_end <= json_start:
            raise ValueError("No valid JSON found in OpenAI response")

        data = json.loads(text[json_start:json_end])

        data['passport_number'] = self._normalize_passport_number(data.get('passport_number', ''))
        data['date_of_birth'] = self._normalize_date(data.get('date_of_birth', ''))
        data['passport_expiry'] = self._normalize_date(data.get('passport_expiry', ''))

        try:
            passport_data = PassportData(
                full_name=data.get('full_name', ''),
                date_of_birth=data.get('date_of_birth', ''),
                passport_number=data.get('passport_number', ''),
                passport_expiry=data.get('passport_expiry', ''),
                nationality=data.get('nationality', ''),
                place_of_birth=data.get('place_of_birth', ''),
                gender=data.get('gender', ''),
                confidence_score=0.95,
                source_file=source_file
            )
        except Exception as validation_err:
            logger.warning(f"Validation error for {source_file}: {validation_err}. Returning raw data.")
            passport_data = PassportData.construct(
                full_name=data.get('full_name', ''),
                date_of_birth=data.get('date_of_birth', ''),
                passport_number=data.get('passport_number', ''),
                passport_expiry=data.get('passport_expiry', ''),
                nationality=data.get('nationality', ''),
                place_of_birth=data.get('place_of_birth', ''),
                gender=data.get('gender', ''),
                confidence_score=0.5,
                source_file=source_file
            )

        if source_file:
            self.extraction_results[source_file] = passport_data

        return passport_data

    async def process_multiple_files(self, file_paths: List[str]) -> Dict[str, PassportData]:
        """Process multiple passport files and return extracted data for each."""
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
        return self.extraction_results

    def clear_results(self):
        self.extraction_results.clear()

    @staticmethod
    def validate_extracted_data(data: PassportData) -> tuple[bool, list[str]]:
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
