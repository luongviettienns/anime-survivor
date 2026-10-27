"""Render source animation rows at large nearest-neighbor scale for human/agent QA."""
from __future__ import annotations
from PIL import Image, ImageDraw
from pack_frames import ROOT, CONTRACT

OUT = ROOT / 'art/contact_sheet.png'
COLS, SCALE, GAP = 8, 5, 12
CANVAS_W, CANVAS_H = 1430, 500
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), '#12182f')
d = ImageDraw.Draw(canvas)
d.text((25, 18), 'ANIME SURVIVOR - frame registration and QA contact sheet', fill='#f9eafa')
y = 68
for sprite, spec in CONTRACT['sprites'].items():
    w, h = spec['frame_width'], spec['frame_height']
    sheet = Image.open(ROOT / 'public/assets' / f'{sprite}.png').convert('RGBA')
    n = spec['columns'] * spec['rows']
    d.text((25, y), f'{sprite.upper()}   {w}x{h} RGBA  /  {n} frames', fill='#7ae3de')
    for index in range(n):
        ox = 25 + index * (w * SCALE + GAP)
        oy = y + 25
        check_size = 10
        for cx in range(0, w * SCALE, check_size):
            for cy in range(0, h * SCALE, check_size):
                color = '#242b49' if (cx // check_size + cy // check_size) % 2 else '#303858'
                d.rectangle((ox+cx, oy+cy, ox+cx+check_size-1, oy+cy+check_size-1), fill=color)
        cropped = sheet.crop((index*w, 0, (index+1)*w, h))
        canvas.alpha_composite(cropped.resize((w*SCALE, h*SCALE), Image.Resampling.NEAREST), (ox, oy))
    y += h * SCALE + 65
OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.convert('RGB').save(OUT)
print(f'Wrote {OUT}')
