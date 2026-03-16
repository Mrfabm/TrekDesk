from PIL import Image
import os

def create_ico():
    # Create icons directory if it doesn't exist
    if not os.path.exists('icons'):
        os.makedirs('icons')
    
    # Open the image
    img = Image.open('app_icon.png')
    
    # Ensure image has alpha channel
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Create different sizes for the ico file with high quality settings
    sizes = [(256,256), (128,128), (64,64), (48,48), (32,32), (16,16)]
    icons = []
    
    # Create each size with proper antialiasing
    for size in sizes:
        # Calculate the scale to maintain aspect ratio
        scale = min(size[0] / img.width, size[1] / img.height)
        new_size = (int(img.width * scale), int(img.height * scale))
        
        # Resize with high-quality Lanczos resampling
        resized = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Create new image with correct size and transparent background
        final = Image.new('RGBA', size, (0, 0, 0, 0))
        
        # Calculate position to center the image
        paste_pos = ((size[0] - new_size[0]) // 2, (size[1] - new_size[1]) // 2)
        
        # Paste resized image in center, using alpha channel as mask
        final.paste(resized, paste_pos, resized)
        
        icons.append(final)
    
    # Save as ico file with all sizes, largest first for best quality
    icons[0].save('icons/app_icon.ico', format='ICO', 
                 sizes=[(i.width, i.height) for i in icons],
                 append_images=icons[1:])
    print("Icon created successfully")

if __name__ == '__main__':
    create_ico() 