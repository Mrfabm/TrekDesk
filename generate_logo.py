"""
TrekDesk icon generator.
Draws a geometric silverback gorilla face on a deep forest-green background.
Run once; outputs app_icon.png then converts to icons/app_icon.ico.
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

# ── palette ────────────────────────────────────────────────────────────────
BG        = (18,  72,  43)   # deep forest green
BG_LIGHT  = (26,  95,  58)   # slightly lighter for gradient fake
DARK      = (12,  18,  12)   # near-black (gorilla fur)
FACE      = (52,  44,  40)   # brownish muzzle
BROW      = (22,  30,  22)   # brow ridge
GOLD      = (255, 185,  15)  # amber eye
PUPIL     = (8,    8,   8)
SILVER    = (195, 200, 190)  # silverback crown
LEAF1     = (28, 110,  55)
LEAF2     = (20,  82,  40)
WHITE     = (255, 255, 255)

SIZE = 512
CX   = SIZE // 2

def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+radius, y0, x1-radius, y1], fill=fill)
    draw.rectangle([x0, y0+radius, x1, y1-radius], fill=fill)
    draw.ellipse([x0, y0, x0+2*radius, y0+2*radius], fill=fill)
    draw.ellipse([x1-2*radius, y0, x1, y0+2*radius], fill=fill)
    draw.ellipse([x0, y1-2*radius, x0+2*radius, y1], fill=fill)
    draw.ellipse([x1-2*radius, y1-2*radius, x1, y1], fill=fill)

def ellipse(draw, cx, cy, rx, ry, fill):
    draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=fill)

def build_icon():
    img  = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── background ─────────────────────────────────────────────────────────
    rounded_rect(draw, [0, 0, SIZE, SIZE], radius=88, fill=BG)

    # soft inner glow (lighter band top-centre)
    glow = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    gd   = ImageDraw.Draw(glow)
    ellipse(gd, CX, 80, 200, 90, BG_LIGHT + (120,))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    img  = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # ── jungle leaves (bottom corners) ─────────────────────────────────────
    # left leaf
    draw.polygon([(0,512),(0,370),(55,295),(130,390),(85,512)],  fill=LEAF1)
    draw.polygon([(0,512),(0,420),(40,355),(90,440),(55,512)],   fill=LEAF2)
    # right leaf
    draw.polygon([(512,512),(512,370),(457,295),(382,390),(427,512)], fill=LEAF1)
    draw.polygon([(512,512),(512,420),(472,355),(422,440),(457,512)], fill=LEAF2)

    # ── silverback crown / sagittal crest ──────────────────────────────────
    ellipse(draw, CX, 118, 72, 42, SILVER)         # silver crown patch
    ellipse(draw, CX, 105, 52, 30, (215,220,210))  # highlight

    # ── skull / head ───────────────────────────────────────────────────────
    ellipse(draw, CX,   175, 148, 132, DARK)        # main skull
    ellipse(draw, CX,   108,  58,  45, DARK)        # crest bump

    # ── brow ridge ─────────────────────────────────────────────────────────
    draw.rectangle([CX-140, 185, CX+140, 225], fill=BROW)
    ellipse(draw, CX, 205, 142, 22, BROW)

    # ── face / muzzle ──────────────────────────────────────────────────────
    ellipse(draw, CX, 270, 95, 88, FACE)

    # ── eyes ───────────────────────────────────────────────────────────────
    for ex in (CX-72, CX+72):
        ey = 218
        ellipse(draw, ex, ey, 30, 26, DARK)           # socket
        ellipse(draw, ex, ey, 20, 18, GOLD)           # iris
        # subtle iris ring
        ellipse(draw, ex, ey, 20, 18, (0,0,0,0))
        draw.arc([ex-20, ey-18, ex+20, ey+18], 0, 360, fill=(200,140,0), width=2)
        ellipse(draw, ex, ey, 10,  9, PUPIL)          # pupil
        ellipse(draw, ex-5, ey-5, 4, 4, (255,255,255,200))  # specular

    # ── nose ───────────────────────────────────────────────────────────────
    ellipse(draw, CX, 268, 56, 30, DARK)
    ellipse(draw, CX-22, 272, 16, 12, (40,32,30))     # left nostril
    ellipse(draw, CX+22, 272, 16, 12, (40,32,30))     # right nostril

    # ── mouth / lip line ───────────────────────────────────────────────────
    ellipse(draw, CX, 316, 65, 30, FACE)
    draw.arc([CX-42, 302, CX+42, 334], 10, 170, fill=DARK, width=5)

    # ── ears ───────────────────────────────────────────────────────────────
    ellipse(draw, CX-152, 196, 22, 28, DARK)
    ellipse(draw, CX+152, 196, 22, 28, DARK)

    # ── neck / shoulders ───────────────────────────────────────────────────
    draw.polygon(
        [(CX-148,295),(CX+148,295),(CX+200,460),(CX+130,512),(CX-130,512),(CX-200,460)],
        fill=DARK)

    # ── chest / belly lighter patch ────────────────────────────────────────
    ellipse(draw, CX, 420, 88, 60, (30,38,30))

    # ── "TD" wordmark bottom-right ─────────────────────────────────────────
    # Small pill badge
    badge_x, badge_y = SIZE-68, SIZE-50
    rounded_rect(draw, [badge_x-38, badge_y-16, badge_x+38, badge_y+16], radius=10, fill=GOLD)
    # Draw T
    draw.rectangle([badge_x-32, badge_y-10, badge_x-5,  badge_y-5],  fill=DARK)  # top bar
    draw.rectangle([badge_x-21, badge_y-10, badge_x-16, badge_y+10], fill=DARK)  # stem
    # Draw D
    draw.rectangle([badge_x+4,  badge_y-10, badge_x+8,  badge_y+10], fill=DARK)  # left bar
    draw.arc([badge_x+4, badge_y-10, badge_x+32, badge_y+10], -90, 90, fill=DARK, width=5)

    # ── apply rounded mask so corners stay transparent ─────────────────────
    mask = Image.new('L', (SIZE, SIZE), 0)
    md   = ImageDraw.Draw(mask)
    rounded_rect(md, [0, 0, SIZE, SIZE], radius=88, fill=255)
    img.putalpha(mask)

    return img


def save_ico(src_png):
    os.makedirs('icons', exist_ok=True)
    img = Image.open(src_png).convert('RGBA')
    sizes = [(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)]
    icons = []
    for s in sizes:
        scale  = min(s[0]/img.width, s[1]/img.height)
        ns     = (int(img.width*scale), int(img.height*scale))
        r      = img.resize(ns, Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', s, (0,0,0,0))
        canvas.paste(r, ((s[0]-ns[0])//2, (s[1]-ns[1])//2), r)
        icons.append(canvas)
    icons[0].save('icons/app_icon.ico', format='ICO',
                  sizes=[(i.width,i.height) for i in icons],
                  append_images=icons[1:])
    print("ICO saved → icons/app_icon.ico")


if __name__ == '__main__':
    icon = build_icon()
    icon.save('app_icon.png', 'PNG')
    print("PNG saved  → app_icon.png")
    save_ico('app_icon.png')
    print("Done.")
