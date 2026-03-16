import pytesseract
import sys
import os

def test_tesseract():
    try:
        # Explicitly set the tesseract path
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # Try to get version info
        version = pytesseract.get_tesseract_version()
        print(f"Tesseract version: {version}")
        print("Tesseract is working correctly!")
        
        # Print the current PATH
        print("\nCurrent PATH:")
        print(os.environ.get('PATH'))
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nPlease check:")
        print("1. Is Tesseract installed?")
        print("2. Is the path correct?")
        print("3. Is Tesseract in your system PATH?")

if __name__ == "__main__":
    test_tesseract() 