"""Un horario escolar inventado, con la forma típica (días en columnas, horas en filas, bloques de color) para probar el escaneo."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1400, 820
ancho_h, alto_enc = 190, 70
dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"]
horas = ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00"]
col = (W - ancho_h) // 5
fila = (H - alto_enc) // len(horas)
im = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(im)
f = lambda n, t: ImageFont.truetype(r"C:\Windows\Fonts\%s.ttf" % n, t)
d.rectangle((0, 0, W, alto_enc), fill=(230, 230, 230))
for i, dia in enumerate(dias):
    d.text((ancho_h + i * col + col // 2 - d.textlength(dia, f("arialbd", 24)) / 2, 22), dia, font=f("arialbd", 24), fill="black")
for j, hr in enumerate(horas):
    y = alto_enc + j * fila
    d.text((14, y + fila // 2 - 12), hr, font=f("arial", 22), fill="black")
    d.line((0, y, W, y), fill=(200, 200, 200), width=1)
for i in range(6):
    d.line((ancho_h + i * col, 0, ancho_h + i * col, H), fill=(200, 200, 200), width=1)

# (día, fila inicial, filas, materia, clave, docente, color)
bloques = [
    (0, 0, 2, ["CALCULO", "DIFERENCIAL"], "MAT-1010", "DRA. RIOS", (40, 90, 200)),
    (0, 2, 2, ["PROGRAMACION"], "PRG-1021", "MTRO. VEGA", (25, 130, 100)),
    (1, 0, 2, ["FISICA"], "FSC-1005", "DR. SALAS", (190, 90, 20)),
    (1, 4, 2, ["INGLES", "TECNICO"], "ING-1002", "MTRA. CRUZ", (110, 60, 170)),
    (2, 0, 2, ["CALCULO", "DIFERENCIAL"], "MAT-1010", "DRA. RIOS", (40, 90, 200)),
    (2, 2, 2, ["PROGRAMACION"], "PRG-1021", "MTRO. VEGA", (25, 130, 100)),
    (3, 0, 2, ["FISICA"], "FSC-1005", "DR. SALAS", (190, 90, 20)),
    (4, 2, 2, ["QUIMICA"], "QUI-1003", "DRA. PARDO", (170, 40, 100)),
]
for dia, f0, n, mat, clave, doc, color in bloques:
    x0 = ancho_h + dia * col + 6
    y0 = alto_enc + f0 * fila + 6
    x1 = ancho_h + (dia + 1) * col - 6
    y1 = alto_enc + (f0 + n) * fila - 6
    d.rectangle((x0, y0, x1, y1), fill=color)
    y = y0 + 16
    for linea in mat:
        d.text((x0 + 14, y), linea, font=f("arialbd", 23), fill="white")
        y += 34
    d.text((x0 + 14, y + 4), clave, font=f("arial", 26), fill="white")
    d.text((x0 + 14, y + 38), doc, font=f("arial", 26), fill="white")
im.save(r"C:\Users\fidel\AppData\Local\Temp\horario-ejemplo.png")
print("ok", im.size)
