import os
from pdf2image import convert_from_path
from PIL import Image
from reportlab.pdfgen import canvas

def create_test_pdf():
    # Create a simple PDF
    pdf_path = "test.pdf"
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "Test PDF Document")
    c.drawString(100, 700, "Name: John Doe")
    c.drawString(100, 650, "Passport Number: AB123456")
    c.save()
    return pdf_path

def test_pdf_setup():
    try:
        # Define Poppler path
        POPPLER_PATH = r'C:\Program Files\Release-24.08.0-0\poppler-24.08.0\Library\bin'
        
        print("Testing Poppler setup...")
        print(f"Looking for Poppler in: {POPPLER_PATH}")
        
        if os.path.exists(POPPLER_PATH):
            print("✓ Poppler directory found")
        else:
            print("✗ Poppler directory not found")
        
        # Check for critical files
        critical_files = ['pdftoppm.exe', 'pdfinfo.exe']
        for file in critical_files:
            file_path = os.path.join(POPPLER_PATH, file)
            if os.path.exists(file_path):
                print(f"✓ Found {file}")
            else:
                print(f"✗ Missing {file}")
        
        # Create and test PDF conversion
        print("\nTesting PDF conversion...")
        try:
            # Create a test PDF
            pdf_path = create_test_pdf()
            print("✓ Created test PDF")
            
            # Convert PDF to images
            images = convert_from_path(pdf_path, poppler_path=POPPLER_PATH)
            print("✓ PDF conversion successful")
            print(f"✓ Converted {len(images)} page(s)")
            
            # Clean up
            os.remove(pdf_path)
            print("✓ Cleanup successful")
            
        except Exception as e:
            print(f"✗ PDF conversion failed: {str(e)}")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_pdf_setup() 