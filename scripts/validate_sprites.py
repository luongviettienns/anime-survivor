"""Validate all animated sprite sheets byte-for-byte against source frames, single tiles, and card icons."""
from __future__ import annotations
import hashlib
import json
from PIL import Image
from pack_frames import ROOT, CONTRACT

OUT = ROOT / 'public/assets'
FRAMES = ROOT / 'art/frames'


def verify() -> None:
    manifest = json.loads((OUT / 'sprites.manifest.json').read_text(encoding='utf-8'))
    if manifest['contract_version'] != CONTRACT['version']:
        raise AssertionError('contract version mismatch')
    for sprite, spec in CONTRACT['sprites'].items():
        metadata = manifest['sprites'][sprite]
        sheet = Image.open(OUT / metadata['file']).convert('RGBA')
        w, h = spec['frame_width'], spec['frame_height']
        if sheet.size != (w * spec['columns'], h * spec['rows']):
            raise AssertionError(f'{sprite}: incorrect sheet dimensions {sheet.size}')
        assert len(metadata['frames']) == spec['columns'] * spec['rows']
        for entry in metadata['frames']:
            x, y, width, height = entry['rect']
            assert (width, height) == (w, h)
            cut = sheet.crop((x, y, x + width, y + height))
            expected = Image.open(FRAMES / sprite / entry['animation'] / f"{entry['index']:03}.png").convert('RGBA')
            if cut.tobytes() != expected.tobytes():
                raise AssertionError(f'{sprite} frame {entry["sheet_index"]}: pixel mismatch')
            box = cut.getchannel('A').getbbox()
            if not box or box[0] == 0 or box[1] == 0 or box[2] == w or box[3] == h:
                raise AssertionError(f'{sprite} frame {entry["sheet_index"]}: empty or touches canvas border {box}')
            digest = hashlib.sha256(cut.tobytes()).hexdigest()
            if digest != entry['sha256']:
                raise AssertionError(f'{sprite} frame {entry["sheet_index"]}: hash mismatch')
        print(f'PASS {sprite}: all {len(metadata["frames"])} crops pixel-identical to source frames')
    for name, size in CONTRACT['single_images'].items():
        with Image.open(OUT / f'{name}.png') as image:
            if list(image.size) != size:
                raise AssertionError(f'{name}: incorrect size {image.size} != {size}')
    for icon in CONTRACT.get('icons', []):
        icon_path = OUT / 'icons' / f'{icon}.png'
        if not icon_path.is_file():
            raise AssertionError(f'Missing required icon: {icon_path}')
        with Image.open(icon_path) as image:
            if list(image.size) != CONTRACT.get('icon_sizes', {}).get(icon, [16, 16]) or image.mode != 'RGBA':
                raise AssertionError(f'icon/{icon}: incorrect original icon size or mode, got {image.size} {image.mode}')
    print(f'PASS all {len(CONTRACT["sprites"])} animated sheets, {len(CONTRACT["single_images"])} tiles, and {len(CONTRACT.get("icons", []))} icons')


if __name__ == '__main__':
    verify()
