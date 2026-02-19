def test_import():
    try:
        import pytesseract
        print("Successfully imported pytesseract")
    except ImportError as e:
        print(f"Import Error: {str(e)}")
    
    try:
        import PIL
        print("Successfully imported PIL (Pillow)")
    except ImportError as e:
        print(f"Import Error: {str(e)}")

if __name__ == "__main__":
    test_import() 