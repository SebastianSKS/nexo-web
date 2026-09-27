"""Convierte a WebP los PNG de assets/capturas (y borra los PNG). Necesita Pillow: pip install pillow."""
import os
import sys

from PIL import Image

carpeta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "capturas")
for nombre in sorted(os.listdir(carpeta)):
    if not nombre.endswith(".png"):
        continue
    ruta = os.path.join(carpeta, nombre)
    Image.open(ruta).convert("RGB").save(ruta[:-4] + ".webp", "WEBP", quality=84, method=6)
    os.remove(ruta)
    print("ok", nombre, file=sys.stderr)
