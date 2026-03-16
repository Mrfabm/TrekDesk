from PIL import Image, ImageDraw
import os

def create_calendar_icon():
    # Create a new image with transparent background
    size = (512, 512)
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    navy = (41, 57, 92)      # Dark navy for outline
    white = (255, 255, 255)  # Pure white
    light_blue = (240, 245, 255)  # Very light blue for calendar background
    check_blue = (71, 136, 199)   # Blue for checkmarks
    
    # Calculate center position and size for the calendar
    margin = 100
    calendar_width = size[0] - (2 * margin)
    calendar_height = size[1] - (2 * margin)
    
    # Draw shadow (soft gray)
    shadow_offset = 15
    draw.rounded_rectangle(
        [margin + shadow_offset, margin + shadow_offset,
         size[0] - margin + shadow_offset, size[1] - margin + shadow_offset],
        radius=40,
        fill=(0, 0, 0, 25)
    )
    
    # Draw main calendar background (pure white)
    draw.rounded_rectangle(
        [margin, margin, size[0] - margin, size[1] - margin],
        radius=40,
        fill=white,
        outline=navy,
        width=2
    )
    
    # Draw top bar
    top_height = 70
    draw.rounded_rectangle(
        [margin + 2, margin + 2, size[0] - margin - 2, margin + top_height],
        radius=38,
        fill=light_blue
    )
    
    # Draw calendar pins
    pin_radius = 12
    pin_margin = 100
    for x in [margin + pin_margin, size[0] - margin - pin_margin]:
        # Pin shadow
        draw.ellipse(
            [x - pin_radius - 1, margin - pin_radius - 1,
             x + pin_radius + 1, margin + pin_radius + 1],
            fill=(0, 0, 0, 30)
        )
        # Pin body
        draw.ellipse(
            [x - pin_radius, margin - pin_radius,
             x + pin_radius, margin + pin_radius],
            fill=white,
            outline=navy,
            width=2
        )
    
    # Draw grid (3x4)
    grid_start_y = margin + top_height + 30
    grid_end_y = size[1] - margin - 30
    cell_size = min((grid_end_y - grid_start_y) // 3,
                    (size[0] - 2 * margin - 60) // 4)
    
    # Draw grid lines
    for i in range(1, 3):  # Horizontal lines
        y = grid_start_y + (i * cell_size)
        draw.line(
            [margin + 30, y, size[0] - margin - 30, y],
            fill=navy,
            width=1
        )
    
    for i in range(1, 4):  # Vertical lines
        x = margin + 30 + (i * cell_size)
        draw.line(
            [x, grid_start_y, x, grid_end_y],
            fill=navy,
            width=1
        )
    
    # Add checkmarks in calendar cells
    check_positions = [(0, 0), (1, 2)]
    for row, col in check_positions:
        x = margin + 30 + (col * cell_size)
        y = grid_start_y + (row * cell_size)
        
        # Draw check circle
        circle_size = cell_size // 2
        circle_x = x + (cell_size - circle_size) // 2
        circle_y = y + (cell_size - circle_size) // 2
        
        # Circle shadow
        draw.ellipse(
            [circle_x + 2, circle_y + 2,
             circle_x + circle_size + 2, circle_y + circle_size + 2],
            fill=(0, 0, 0, 25)
        )
        
        # Circle background
        draw.ellipse(
            [circle_x, circle_y,
             circle_x + circle_size, circle_y + circle_size],
            fill=check_blue
        )
        
        # Draw check mark
        check_margin = circle_size // 4
        draw.line(
            [circle_x + check_margin, circle_y + circle_size//2,
             circle_x + circle_size//2.5, circle_y + circle_size - check_margin,
             circle_x + circle_size - check_margin, circle_y + check_margin],
            fill=white,
            width=3,
            joint="curve"
        )
    
    # Add floating checkmark badge
    badge_size = 90
    badge_x = size[0] - margin - badge_size - 20
    badge_y = size[1] - margin - badge_size - 20
    
    # Badge shadow
    draw.ellipse(
        [badge_x + 3, badge_y + 3,
         badge_x + badge_size + 3, badge_y + badge_size + 3],
        fill=(0, 0, 0, 25)
    )
    
    # Badge background
    draw.ellipse(
        [badge_x, badge_y,
         badge_x + badge_size, badge_y + badge_size],
        fill=white,
        outline=navy,
        width=2
    )
    
    # Badge checkmark
    check_margin = badge_size // 4
    draw.line(
        [badge_x + check_margin, badge_y + badge_size//2,
         badge_x + badge_size//2.5, badge_y + badge_size - check_margin,
         badge_x + badge_size - check_margin, badge_y + check_margin],
        fill=check_blue,
        width=4,
        joint="curve"
    )
    
    # Save the image with high quality
    img.save('app_icon.png', 'PNG', optimize=False, quality=95)
    print("Calendar icon created as app_icon.png")

if __name__ == '__main__':
    create_calendar_icon() 