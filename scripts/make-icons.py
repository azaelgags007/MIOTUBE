"""Genera los iconos PWA de Phonoplayer desde BRAND_LOGO.

Fondo blanco solido (iOS no soporta transparencia en iconos de app),
emblema al ~80% del canvas con padding uniforme, remuestreo LANCZOS.
"""
from PIL import Image
import os

SRC = "/mnt/user-data/uploads/Gemini_Generated_Image_6lipcn6lipcn6lip.jpg"
OUT_ICONS = "/home/claude/phonoplayer/public/icons"
OUT_PUBLIC = "/home/claude/phonoplayer/public"

logo = Image.open(SRC).convert("RGBA")

# El logo viene con marco negro cuadrado; lo recortamos a cuadrado centrado
w, h = logo.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
logo = logo.crop((left, top, left + side, top + side))

TARGETS = [
    (os.path.join(OUT_ICONS, "icon-192.png"), 192),
    (os.path.join(OUT_ICONS, "icon-512.png"), 512),
    (os.path.join(OUT_ICONS, "apple-touch-icon.png"), 180),
    (os.path.join(OUT_PUBLIC, "apple-touch-icon.png"), 180),
    (os.path.join(OUT_PUBLIC, "apple-touch-icon-precomposed.png"), 180),
]

for path, size in TARGETS:
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    inner = int(size * 0.80)
    emblem = logo.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(emblem, (offset, offset), emblem)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    canvas.save(path, "PNG", optimize=True)
    print(f"{path}  {size}x{size}")

# Favicon
fav = Image.new("RGB", (64, 64), (255, 255, 255))
fav.paste(logo.resize((52, 52), Image.LANCZOS), (6, 6), logo.resize((52, 52), Image.LANCZOS))
fav.save(os.path.join(OUT_PUBLIC, "favicon.png"), "PNG", optimize=True)
print("favicon.png  64x64")
