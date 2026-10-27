"""Validate sprite sheets byte-for-byte against the source frames and contract."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
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
            raise AssertionError(f'{sprite}: incorrect sheet dimensions')
        assert len(metadata['frames']) == spec['columns'] * spec['rows']
        for entry in metadata['frames']:
            x, y, width, height = entry['rect']
            assert (width, height) == (w, h)
            cut = sheet.crop((x, y, x + width, y + height))
            expected = Image.open(FRAMES / sprite / entry['animation'] / f"{entry['index']:03}.png").convert('RGBA')
            if cut.tobytes() != expected.tobytes():
                raise AssertionError(f'{sprite} frame {entry["sheet_index"]}: pixel mismatch')
            digest = hashlib.sha256(cut.tobytes()).hexdigest()
            if digest != entry['sha256']:
                raise AssertionError(f'{sprite} frame {entry["sheet_index"]}: hash mismatch')
        print(f'PASS {sprite}: all {len(metadata["frames"])} crops pixel-identical to source frames')
    for name, size in CONTRACT['single_images'].items():
        with Image.open(OUT / f'{name}.png') as image:
            if list(image.size) != size:
                raise AssertionError(f'{name}: incorrect size')
    print('PASS all generated asset dimensions')


if __name__ == '__main__':
    verify()
