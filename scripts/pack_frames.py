"""Pack independently-created animation frames to an exact grid with a verified manifest.

Example: python scripts/pack_frames.py --input art/frames --output public/assets
Expected paths: art/frames/hero/idle/000.png .. 003.png; hero/walk/000.png ...
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = json.loads((ROOT / 'docs/ART_CONTRACT.json').read_text(encoding='utf-8'))


def sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest()


def pack_sprite(sprite: str, source: Path, output: Path) -> dict:
    spec = CONTRACT['sprites'][sprite]
    width, height = spec['frame_width'], spec['frame_height']
    expected = [(animation, index) for animation in spec['order']
                for index in range(spec['animations'][animation])]
    if len(expected) != spec['columns'] * spec['rows']:
        raise ValueError(f'{sprite}: frame counts do not match grid')
    sheet = Image.new('RGBA', (width * spec['columns'], height * spec['rows']))
    manifest_frames = []
    for flat_index, (animation, index) in enumerate(expected):
        path = source / sprite / animation / f'{index:03}.png'
        if not path.is_file():
            raise FileNotFoundError(f'Missing required animation frame: {path}')
        with Image.open(path) as opened:
            if opened.mode != 'RGBA':
                raise ValueError(f'{path}: expected RGBA, got {opened.mode}')
            frame = opened.copy()
        if frame.size != (width, height):
            raise ValueError(f'{path}: expected {width}x{height}, got {frame.size}')
        box = frame.getchannel('A').getbbox()
        if not box:
            raise ValueError(f'{path}: completely transparent frame')
        if box[0] == 0 or box[1] == 0 or box[2] == width or box[3] == height:
            raise ValueError(f'{path}: artwork clipped or touching a frame boundary: {box}')
        col, row = flat_index % spec['columns'], flat_index // spec['columns']
        sheet.paste(frame, (col * width, row * height))
        manifest_frames.append({
            'animation': animation, 'index': index, 'sheet_index': flat_index,
            'rect': [col * width, row * height, width, height],
            'sha256': sha256(frame), 'alpha_bbox': list(box),
        })
    output.mkdir(parents=True, exist_ok=True)
    sheet.save(output / f'{sprite}.png')
    return {'file': f'{sprite}.png', 'frame_width': width, 'frame_height': height,
            'columns': spec['columns'], 'rows': spec['rows'], 'frames': manifest_frames}


def pack_all(source: Path, output: Path) -> dict:
    manifest = {'contract_version': 1, 'sprites': {}}
    for sprite in CONTRACT['sprites']:
        manifest['sprites'][sprite] = pack_sprite(sprite, source, output)
    (output / 'sprites.manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=ROOT / 'art/frames')
    parser.add_argument('--output', type=Path, default=ROOT / 'public/assets')
    args = parser.parse_args()
    manifest = pack_all(args.input, args.output)
    for sprite, entry in manifest['sprites'].items():
        print(f'OK {sprite}: {len(entry["frames"])} frames; {entry["columns"]}x{entry["rows"]} grid')
