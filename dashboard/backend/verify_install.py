def verify_packages():
    try:
        # Test pytesseract import
        print("Testing pytesseract...")
        import pytesseract
        print("✓ pytesseract package is installed")
        
        # Test pdf2image import
        print("\nTesting pdf2image...")
        import pdf2image
        print("✓ pdf2image package is installed")
        
        # Test PIL import
        print("\nTesting Pillow (PIL)...")
        from PIL import Image
        print("✓ Pillow package is installed")
        
        # Test dateutil import
        print("\nTesting python-dateutil...")
        from dateutil import parser
        print("✓ python-dateutil package is installed")
        
    except ImportError as e:
        print(f"✗ Error: {str(e)}")
        print("Please run: pip install -r requirements.txt")
        
if __name__ == "__main__":
    verify_packages() 