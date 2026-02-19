import os
from app.utils.ocr_processor import OCRProcessor
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black, white

def create_test_passport_pdf():
    """Create a test PDF that simulates a passport data page"""
    pdf_path = "test_passport.pdf"
    c = canvas.Canvas(pdf_path, pagesize=A4)
    c.setFillColor(black)
    
    # Set a larger base font size and use a more readable font
    base_font_size = 14
    header_font_size = 18
    
    # Add passport header
    c.setFont("Helvetica-Bold", header_font_size)
    c.drawString(50, 750, "PASSPORT / PASSEPORT")
    
    # Helper function to draw a field
    def draw_field(y, label, value, is_bold=True):
        c.setFont("Helvetica", base_font_size)
        c.drawString(50, y, label)
        if is_bold:
            c.setFont("Helvetica-Bold", base_font_size)
        else:
            c.setFont("Helvetica", base_font_size)
        c.drawString(200, y, value)
    
    # Add main passport data with consistent spacing
    current_y = 700
    spacing = 40
    
    draw_field(current_y, "Type / Type", "P")
    current_y -= spacing
    
    draw_field(current_y, "Surname / Nom", "SMITH")
    current_y -= spacing
    
    draw_field(current_y, "Given Names / Prénoms", "JOHN JAMES")
    current_y -= spacing
    
    draw_field(current_y, "Nationality / Nationalité", "BRITISH")
    current_y -= spacing
    
    draw_field(current_y, "Date of Birth / Date de naissance", "15 JAN 1990")
    current_y -= spacing
    
    draw_field(current_y, "Place of Birth / Lieu de naissance", "LONDON")
    current_y -= spacing
    
    draw_field(current_y, "Sex / Sexe", "M")
    current_y -= spacing
    
    draw_field(current_y, "Passport No. / N° du passeport", "AB123456")
    current_y -= spacing
    
    draw_field(current_y, "Date of Issue / Date de délivrance", "01 JAN 2020")
    current_y -= spacing
    
    draw_field(current_y, "Date of Expiry / Date d'expiration", "01 JAN 2030")
    current_y -= spacing
    
    # Add MRZ (Machine Readable Zone) with fixed-width font
    c.setFont("Courier-Bold", base_font_size)  # Use bold Courier for better clarity
    c.drawString(50, 120, "P<GBRSMITH<<JOHN<JAMES<<<<<<<<<<<<<<<<<<<<<<<<")
    c.drawString(50, 100, "AB123456<4GBR9001153M3001017<<<<<<<<<<<<<<<<<02")
    
    c.save()
    return pdf_path

def test_passport_ocr():
    try:
        # Create test PDF
        pdf_path = create_test_passport_pdf()
        print("✓ Created test passport PDF")
        
        # Initialize OCR processor
        ocr_processor = OCRProcessor()
        
        # Extract text
        text = ocr_processor.extract_text_from_image(pdf_path)
        if text:
            print("✓ Successfully extracted text from PDF")
            print("\nExtracted text:")
            print(text)
            
            # Extract structured data
            data = ocr_processor.extract_passport_data(text)
            print("\nExtracted passport data:")
            for key, value in data.items():
                print(f"{key}: {value}")
                
            # Validate extracted data
            expected_data = {
                'full_name': 'Smith, John James',
                'date_of_birth': '1990-01-15',
                'passport_number': 'AB123456',
                'passport_expiry': '2030-01-01'
            }
            
            all_correct = True
            print("\nValidation results:")
            for key, expected_value in expected_data.items():
                if data.get(key) == expected_value:
                    print(f"✓ {key}: Correct")
                else:
                    print(f"✗ {key}: Expected {expected_value}, got {data.get(key)}")
                    all_correct = False
            
            if all_correct:
                print("\n✓ All data extracted correctly!")
            else:
                print("\n✗ Some data was not extracted correctly")
                
        else:
            print("✗ Failed to extract text")

        # Clean up
        os.remove(pdf_path)
        print("\n✓ Cleanup successful")
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")

if __name__ == "__main__":
    test_passport_ocr() 