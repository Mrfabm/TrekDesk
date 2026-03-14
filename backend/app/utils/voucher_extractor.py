import json
import os
import base64
from pdf2image import convert_from_path
import tempfile
import shutil
import logging
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env using absolute path so it works regardless of working directory
_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(_ENV_PATH)

_OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not _OPENAI_KEY:
    raise RuntimeError(f"OPENAI_API_KEY not found. Looked for .env at: {_ENV_PATH}")

client = OpenAI(api_key=_OPENAI_KEY)


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
        """Convert first page of PDF to image and return path."""
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
        """Extract data from voucher image using GPT-4o Vision."""
        try:
            if file_path.lower().endswith('.pdf'):
                image_path = self.convert_pdf_to_image(file_path)
            else:
                image_path = file_path

            image_b64 = self._encode_image(image_path)

            prompt = """Extract the following information from this voucher image.

Return ONLY a JSON object with these exact keys (no extra text):
{
    "booking_name": "",
    "booking_reference": "",
    "trek_date": "YYYY-MM-DD",
    "head_of_file": "",
    "request_date": "YYYY-MM-DD",
    "product_type": "",
    "number_of_people": 0
}

Rules:
- Convert ALL dates to YYYY-MM-DD format
- booking_reference should be uppercase
- product_type must be exactly 'Mountain Gorillas' or 'Golden Monkeys'
- number_of_people must be a positive integer
- head_of_file is the name found after 'Booking made by'
- If a field cannot be read confidently, leave it as an empty string or 0 for numbers"""

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

            data['agent_client'] = data.get('booking_reference', '')[:3] if data.get('booking_reference') else ''
            data['confidence_score'] = 0.95
            data['source_file'] = source_file

            voucher_data = VoucherData(**data)
            return voucher_data

        except Exception as e:
            logger.error(f"Error extracting voucher data from {source_file}: {str(e)}")
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


async def extract_voucher_data(file_path: str) -> dict:
    """Helper function to extract data from a voucher file."""
    try:
        extractor = VoucherExtractor()
        data = await extractor.extract_data(file_path, file_path)
        return data.model_dump()
    except Exception as e:
        logger.error(f"Error in extract_voucher_data: {e}")
        raise
