import pytesseract
from PIL import Image
import os

def test_complete_setup():
    try:
        # 1. Test Tesseract Installation
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract Version: {version}")
        
        # 2. Test Python Package
        print("✓ pytesseract package is installed")
        
        # 3. Test PATH
        tesseract_path = os.environ.get('PATH')
        if r'Tesseract-OCR' in tesseract_path:
            print("✓ Tesseract is in PATH")
        else:
            print("✗ Tesseract is not in PATH")
            
        # 4. Test Basic OCR (optional)
        # Create a simple test image with text
        from PIL import Image, ImageDraw
        
        # Create a new image with white background
        img = Image.new('RGB', (200, 50), color='white')
        d = ImageDraw.Draw(img)
        d.text((10,10), "Test OCR", fill='black')
        img.save('test.png')
        
        # Try to read the text
        text = pytesseract.image_to_string('test.png')
        print(f"\nOCR Test Result: {text.strip()}")
        
        # Clean up
        os.remove('test.png')
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Verify Tesseract is installed at: C:\\Program Files\\Tesseract-OCR")
        print("2. Check if the path is correctly set in Environment Variables")
        print("3. Try restarting your terminal/IDE")
        print("4. Make sure you're in your virtual environment")

if __name__ == "__main__":
    test_complete_setup() 