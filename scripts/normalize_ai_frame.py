"""Normalize a transparent AI output to an exact-size, bottom-anchored pixel-art frame.

Fails closed on opaque backgrounds: background removal is a separate reviewed art task.
Example:
  python scripts/normalize_ai_frame.py --input raw_idle_0.png --output art/frames/hero/idle/000.png --sprite hero
"""
import argparse
from pathlib import Path
from PIL import Image
from pack_frames import CONTRACT


def normalize(source: Path, output: Path, sprite: str) -> None:
    spec = CONTRACT['sprites'][sprite]
    w, h = spec['frame_width'], spec['frame_height']
    with Image.open(source) as im:
        image = im.convert('RGBA')
    alpha = image.getchannel('A')
    if not alpha.getbbox():
        raise ValueError('Empty frame: no visible artwork')
    if alpha.getextrema()[0] == 255:
        raise ValueError('Image lacks transparency. Remove background before normalizing; do not guess.')
    bbox = alpha.getbbox()
    assert bbox is not None
    cropped = image.crop(bbox)
    # Reserve a clean 3-pixel inset and a fixed bottom-center foot anchor.
    max_w, max_h = w - 6, h - 6
    factor = min(max_w / cropped.width, max_h / cropped.height)
    nw, nh = max(1, round(cropped.width * factor)), max(1, round(cropped.height * factor))
    scaled = cropped.resize((nw, nh), Image.Resampling.NEAREST)
    # Threshold alpha to avoid semi-transparent color fringes, preserving sprite pixels.
    scaled.putalpha(scaled.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = (w - nw) // 2
    y = h - 3 - nh
    canvas.alpha_composite(scaled, (x, y))
    if canvas.getchannel('A').getbbox() is None:
        raise ValueError('Input became transparent after alpha threshold')
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)
    print(f'Wrote {output} ({w}x{h}, anchor=bottom-center); visual QA still required')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--sprite', choices=sorted(CONTRACT['sprites']), required=True)
    a = ap.parse_args()
    normalize(a.input, a.output, a.sprite)
