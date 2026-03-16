import pytesseract
from pdf2image import convert_from_path
from PIL import Image, ImageEnhance, ImageFilter
import easyocr
import re
from datetime import datetime, date
from dateutil import parser
import os
import logging
import sys
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Tesseract path based on OS
if sys.platform.startswith('win'):
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    POPPLER_PATH = r'C:\Program Files\Release-24.08.0-0\poppler-24.08.0\Library\bin'
else:
    POPPLER_PATH = None  # Linux/Mac usually have poppler in PATH

class OCRProcessor:
    SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif']
    
    def __init__(self):
        self.reader = easyocr.Reader(['en'])  # Initialize EasyOCR
        
    @staticmethod
    def enhance_image(image):
        """Apply various image enhancement techniques using PIL"""
        try:
            # Convert to grayscale if not already
            if image.mode != 'L':
                image = image.convert('L')
            
            # Resize to a reasonable size if too large
            max_size = 2000
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Apply Otsu's thresholding
            def otsu_threshold(im):
                # Calculate histogram
                hist = im.histogram()
                total = sum(hist)
                
                sum_all = sum(i * h for i, h in enumerate(hist))
                sum_back = 0
                w_back = 0
                w_fore = 0
                var_max = 0
                threshold = 0
                
                for t in range(256):
                    w_back += hist[t]
                    if w_back == 0:
                        continue
                        
                    w_fore = total - w_back
                    if w_fore == 0:
                        break
                        
                    sum_back += t * hist[t]
                    mean_back = sum_back / w_back
                    mean_fore = (sum_all - sum_back) / w_fore
                    
                    var_between = w_back * w_fore * (mean_back - mean_fore) ** 2
                    if var_between > var_max:
                        var_max = var_between
                        threshold = t
                
                return threshold
            
            # Apply Otsu's threshold
            threshold = otsu_threshold(image)
            image = image.point(lambda x: 255 if x > threshold else 0)
            
            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # Apply unsharp mask for better edge definition
            image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            
            # Remove small noise
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            return image
        except Exception as e:
            logger.warning(f"Image enhancement failed: {str(e)}")
            return image

    @staticmethod
    def check_tesseract():
        """Check if Tesseract is properly installed and configured"""
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {version}")
            return True
        except Exception as e:
            logger.error(f"Tesseract not properly configured: {str(e)}")
            return False

    def extract_text_from_image(self, file_path):
        """Extract text using multiple OCR engines with fallback"""
        try:
            if not self.check_tesseract():
                raise Exception("Tesseract OCR is not properly configured")

            logger.info(f"Processing file: {file_path}")
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Handle PDF files
            if file_ext == '.pdf':
                logger.info("Converting PDF to image")
                try:
                    pages = convert_from_path(
                        file_path, 
                        poppler_path=POPPLER_PATH,
                        dpi=300  # Higher DPI for better quality
                    )
                    if not pages:
                        raise ValueError("No pages found in PDF")
                    image = pages[0]
                except Exception as e:
                    logger.error(f"PDF conversion error: {str(e)}")
                    raise Exception(f"Failed to convert PDF: {str(e)}")
            # Handle image files
            elif file_ext in self.SUPPORTED_IMAGE_FORMATS:
                logger.info("Opening image file")
                try:
                    image = Image.open(file_path)
                except Exception as e:
                    logger.error(f"Image opening error: {str(e)}")
                    raise Exception(f"Failed to open image: {str(e)}")
            else:
                raise ValueError(f"Unsupported file format: {file_ext}")

            # Enhance image
            enhanced_image = self.enhance_image(image)
            
            # Try multiple OCR approaches
            text_results = []
            
            # 1. Try Tesseract with optimized settings for passport
            try:
                logger.info("Attempting Tesseract OCR with optimized passport settings")
                # Use multiple page segmentation modes
                psm_modes = [3, 4, 6]  # 3=auto, 4=single column, 6=uniform block
                for psm in psm_modes:
                    text = pytesseract.image_to_string(
                        enhanced_image,
                        config=f'--psm {psm} --oem 3 -c tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/ " --dpi 300'
                    )
                    if text.strip():
                        text_results.append(text)
                        
                # Try again with different image processing
                inverted_image = Image.eval(enhanced_image, lambda x: 255 - x)
                for psm in psm_modes:
                    text = pytesseract.image_to_string(
                        inverted_image,
                        config=f'--psm {psm} --oem 3 -c tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/ " --dpi 300'
                    )
                    if text.strip():
                        text_results.append(text)
            except Exception as e:
                logger.warning(f"Tesseract passport-specific OCR failed: {str(e)}")

            # 2. Try EasyOCR
            try:
                logger.info("Attempting EasyOCR")
                # Convert PIL image to bytes
                img_byte_arr = io.BytesIO()
                enhanced_image.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                
                result = self.reader.readtext(img_byte_arr)
                easy_text = '\n'.join([item[1] for item in result])
                if easy_text.strip():
                    text_results.append(easy_text)
                    
                # Try with inverted image
                inverted_byte_arr = io.BytesIO()
                inverted_image.save(inverted_byte_arr, format='PNG')
                inverted_byte_arr = inverted_byte_arr.getvalue()
                
                result = self.reader.readtext(inverted_byte_arr)
                easy_text = '\n'.join([item[1] for item in result])
                if easy_text.strip():
                    text_results.append(easy_text)
            except Exception as e:
                logger.warning(f"EasyOCR failed: {str(e)}")

            if not text_results:
                raise ValueError("No text could be extracted from the image")

            # Combine and clean results
            combined_text = '\n'.join(text_results)
            cleaned_text = self.clean_text(combined_text)
            
            logger.info(f"Successfully extracted text: {cleaned_text[:200]}...")
            return cleaned_text

        except Exception as e:
            logger.error(f"Error in text extraction: {str(e)}")
            raise Exception(f"Text extraction failed: {str(e)}")

    @staticmethod
    def clean_text(text):
        """Clean and normalize extracted text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Fix common OCR mistakes
        replacements = {
            'O': '0',
            'I': '1',
            'l': '1',
            'S': '5',
            'B': '8',
        }
        
        # Apply replacements only to parts that look like numbers
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            # If line contains numbers, apply replacements
            if re.search(r'\d', line):
                for old, new in replacements.items():
                    line = line.replace(old, new)
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)

    def extract_passport_data(self, text: str) -> dict:
        """Extract structured passport data from OCR text"""
        data = {
            'full_name': '',
            'date_of_birth': '',
            'passport_number': '',
            'passport_expiry': ''
        }
        
        try:
            lines = text.split('\n')
            for i, line in enumerate(lines):
                line = line.strip().upper()
                
                # Extract full name
                if any(x in line for x in ['SURNAME', 'NOM']):
                    try:
                        surname = lines[i+1].strip()
                        # Look for given names in next lines
                        for j in range(i+2, min(i+5, len(lines))):
                            if 'GIVEN' in lines[j].upper() or 'PRENOM' in lines[j].upper():
                                given_names = lines[j+1].strip()
                                data['full_name'] = f"{surname}, {given_names}"
                                break
                    except:
                        pass
                
                # Extract passport number
                if 'PASSPORT' in line and ('NO' in line or 'NUMBER' in line):
                    try:
                        # Look in current and next line
                        for check_line in [line, lines[i+1].strip()]:
                            match = re.search(r'[A-Z0-9]{6,9}', check_line)
                            if match:
                                data['passport_number'] = match.group()
                                break
                    except:
                        pass
                
                # Extract dates
                try:
                    if 'BIRTH' in line or 'NAISSANCE' in line:
                        # Look in current and next line
                        for check_line in [line, lines[i+1].strip()]:
                            # Try various date formats
                            date_matches = re.findall(r'\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*\d{4}', check_line.upper())
                            if date_matches:
                                try:
                                    date_obj = parser.parse(date_matches[0])
                                    data['date_of_birth'] = date_obj.strftime('%Y-%m-%d')
                                    break
                                except:
                                    pass
                    
                    if 'EXPIRY' in line or 'EXPIRATION' in line:
                        # Look in current and next line
                        for check_line in [line, lines[i+1].strip()]:
                            # Try various date formats
                            date_matches = re.findall(r'\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*\d{4}', check_line.upper())
                            if date_matches:
                                try:
                                    date_obj = parser.parse(date_matches[0])
                                    data['passport_expiry'] = date_obj.strftime('%Y-%m-%d')
                                    break
                                except:
                                    pass
                except:
                    pass
                            
                # Try to extract from MRZ if present
                if re.match(r'^P[A-Z0-9<]{43}$', line):
                    try:
                        # Parse name from MRZ
                        name_part = re.search(r'P[A-Z]{1,3}([A-Z]+)<<([A-Z]+)', line)
                        if name_part:
                            surname = name_part.group(1).replace('<', ' ').strip()
                            given_names = name_part.group(2).replace('<', ' ').strip()
                            if not data['full_name']:  # Only set if not already found
                                data['full_name'] = f"{surname}, {given_names}"
                            
                        # Look for the second MRZ line
                        if i + 1 < len(lines):
                            mrz_line2 = lines[i + 1].strip()
                            if re.match(r'^[A-Z0-9<]{44}$', mrz_line2):
                                # Extract passport number if not already found
                                if not data['passport_number']:
                                    passport_match = re.match(r'([A-Z0-9]{9})', mrz_line2)
                                    if passport_match:
                                        data['passport_number'] = passport_match.group(1)
                                
                                # Extract dates if not already found
                                dates = re.findall(r'\d{6}', mrz_line2)
                                if len(dates) >= 2:
                                    for date_str in dates:
                                        try:
                                            year = int(date_str[:2])
                                            month = int(date_str[2:4])
                                            day = int(date_str[4:])
                                            
                                            # Assume years 00-50 are 2000s, 51-99 are 1900s
                                            if year < 50:
                                                year += 2000
                                            else:
                                                year += 1900
                                                
                                            date_obj = date(year, month, day)
                                            formatted_date = date_obj.strftime('%Y-%m-%d')
                                            
                                            # First date is usually DOB, second is expiry
                                            if not data['date_of_birth']:
                                                data['date_of_birth'] = formatted_date
                                            elif not data['passport_expiry']:
                                                data['passport_expiry'] = formatted_date
                                        except:
                                            continue
                    except Exception as e:
                        logger.warning(f"Error parsing MRZ: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error extracting passport data: {str(e)}")
        
        return data

    @staticmethod
    def is_valid_file(filename):
        """Check if the file format is supported"""
        ext = os.path.splitext(filename)[1].lower()
        return ext == '.pdf' or ext in OCRProcessor.SUPPORTED_IMAGE_FORMATS 