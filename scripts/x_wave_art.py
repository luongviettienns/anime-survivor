"""Pack/check three native crescent-combination X-wave frames without pixel edits."""
import argparse
import hashlib
import shutil
from pathlib import Path
from PIL import Image
from actor_v3_art import GAME, read, write
import pack_frames
import validate_sprites

ROOT = GAME / 'art/source/x-wave-cross'
OUT = GAME / 'public/assets/dual-element/x-wave-cross'
KEY = 'vfx_dual_element_x'
CELL = 1792

def build():
    textures, entries = [], []
    for index in range(3):
        entry = read(ROOT / 'source' / f'{index:03}.json')
        saved = ROOT / 'originals' / f'{index:03}.png'
        original = Path(entry['path'])
        if not original.is_file():
            original = saved
        saved.parent.mkdir(parents=True, exist_ok=True)
        if original.resolve() != saved.resolve():
            shutil.copyfile(original, saved)
        runtime = OUT / 'originals' / f'{index:03}.png'
        runtime.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(saved, runtime)
        with Image.open(saved) as image:
            if image.mode != 'RGBA':
                raise ValueError(f'{saved}: expected native RGBA')
            box = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
            if not box or min(box[:2]) <= 0 or box[2] >= image.width or box[3] >= image.height:
                raise ValueError(f'{saved}: empty or clipped source')
            offset = [(CELL - image.width) // 2, (CELL - image.height) // 2]
            if min(offset) < 1:
                raise ValueError(f'{saved}: cannot fit padding')
            padded = Image.new('RGBA', (CELL, CELL))
            padded.paste(image, tuple(offset))
            if padded.crop((offset[0], offset[1], offset[0] + image.width, offset[1] + image.height)).tobytes() != image.tobytes():
                raise ValueError('Native pixel mismatch')
            target = ROOT / 'frames/x_wave_dual/play' / f'{index:03}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            padded.save(target)
            textures.append({'image': f'originals/{index:03}.png', 'frames': [{
                'filename': f'{KEY}/{index:03}', 'frame': {'x': 0,'y': 0,'w': image.width,'h': image.height},
                'rotated': False,'trimmed': True,'spriteSourceSize': {'x': offset[0],'y': offset[1],'w': image.width,'h': image.height},
                'sourceSize': {'w': CELL,'h': CELL}}]})
            entry.update({'size': list(image.size),'alpha_bbox': list(box),'offset': offset,
                          'sha256': hashlib.sha256(saved.read_bytes()).hexdigest()})
        entries.append(entry)
    contract = {'version': 1,'sprites': {'x_wave_dual': {'frame_width': CELL,'frame_height': CELL,
        'columns': 3,'rows': 1,'order': ['play'],'animations': {'play': 3}}},'single_images': {}}
    pack_frames.CONTRACT = contract
    pack_frames.pack_all(ROOT / 'frames', ROOT / 'sheets')
    write(ROOT / 'contract.json', contract)
    write(ROOT / 'provenance.json', {'tool': 'built-in image_gen','native_pixels_preserved': True,
        'direction': 'right-facing travelling VFX; rotate with aim, no ground rings','records': entries})
    write(OUT / f'{KEY}.atlas.json', {'textures': textures,'meta': {'format': 'RGBA8888','scale': '1'}})

def verify():
    records = read(ROOT / 'provenance.json')['records']
    textures = read(OUT / f'{KEY}.atlas.json')['textures']
    if len(records) != 3:
        raise ValueError('Expected three independently authored X-wave poses')
    if len(textures) != 3:
        raise ValueError('Expected three runtime atlas pages')
    for i, entry in enumerate(records):
        for source in [ROOT / 'originals' / f'{i:03}.png', OUT / 'originals' / f'{i:03}.png']:
            if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']:
                raise ValueError(f'{source}: changed native source bytes')
        with Image.open(ROOT / 'originals' / f'{i:03}.png') as original:
            with Image.open(ROOT / 'frames/x_wave_dual/play' / f'{i:03}.png') as padded:
                x, y = entry['offset']
                if padded.crop((x, y, x + original.width, y + original.height)).tobytes() != original.tobytes():
                    raise ValueError('Padded frame changed native pixels')
            frame = textures[i]['frames'][0]
            if (textures[i]['image'] != f'originals/{i:03}.png'
                    or frame['filename'] != f'{KEY}/{i:03}'
                    or frame['frame'] != {'x': 0, 'y': 0, 'w': original.width, 'h': original.height}
                    or frame['spriteSourceSize'] != {'x': x, 'y': y, 'w': original.width, 'h': original.height}
                    or frame['sourceSize'] != {'w': CELL, 'h': CELL}):
                raise ValueError('Runtime atlas placement mismatch')
    validate_sprites.CONTRACT = read(ROOT / 'contract.json')
    validate_sprites.FRAMES, validate_sprites.OUT = ROOT / 'frames', ROOT / 'sheets'
    validate_sprites.verify()
    print('PASS3native X-wave source/runtime images and exact archival crops')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    if not parser.parse_args().check:
        build()
    verify()
