import pytest
from app.utils.ocr_processor import OCRProcessor
import os
from PIL import Image
import io

def create_test_image():
    """Create a test image with text"""
    img = Image.new('RGB', (300, 100), color='white')
    img_path = os.path.join(os.path.dirname(__file__), "test_data/test_passport.png")
    img.save(img_path)
    return img_path

def test_extract_text_from_image():
    # Create a test image
    test_file = create_test_image()
    
    try:
        # Test text extraction
        text = OCRProcessor.extract_text_from_image(test_file)
        assert text is not None, "No text extracted"
        
    except Exception as e:
        pytest.fail(f"OCR extraction failed: {str(e)}")
    finally:
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

def test_supported_file_types():
    # Test valid file types
    assert OCRProcessor.is_valid_file("test.pdf"), "PDF should be supported"
    assert OCRProcessor.is_valid_file("test.jpg"), "JPG should be supported"
    assert OCRProcessor.is_valid_file("test.png"), "PNG should be supported"
    assert OCRProcessor.is_valid_file("test.tiff"), "TIFF should be supported"
    
    # Test invalid file types
    assert not OCRProcessor.is_valid_file("test.doc"), "DOC should not be supported"
    assert not OCRProcessor.is_valid_file("test.txt"), "TXT should not be supported" 