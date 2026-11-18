"""Lossless, padding-only asset packaging; does not modify game code or its contract."""
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import pack_frames
import validate_sprites

OUT = ROOT / 'public/assets/dual-element'
FRAMES = ROOT / 'art/frames/dual-element'
REVIEW = ROOT / 'art/review/dual-element'
CELL = 1792


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    plan = read(SOURCE / 'asset-plan.json')
    anchors = read(SOURCE / 'anchor-overrides.json')
    assets = {'neutral': SOURCE / 'reference.png'}
    provenance = []
    for filename in ['character-generation.json', 'vfx-generation.json']:
        for entry in read(SOURCE / filename):
            key = entry['key'] if 'frame' not in entry else f"{entry['key']}/{entry['frame']:03}"
            relative = f'characters/{key}.png' if 'frame' not in entry else f'vfx/{key}.png'
            target = SOURCE / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                shutil.copyfile(entry['path'], target)
            assets[key] = target
            provenance.append({'asset': relative, 'prompt': entry['prompt'], 'sha256': digest(target)})
    originals = {}
    for key, path in assets.items():
        image = Image.open(path)
        assert image.mode == 'RGBA', (key, image.mode)
        assert image.size == (1254, 1254), (key, image.size)
        visible = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
        assert visible and min(visible[:2]) > 0 and max(visible[2:]) < 1254, (key, visible)
        target = OUT / 'originals' / f'{key}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        assert digest(path) == digest(target)
        # Feet are measured within the central boots region, excluding blade tips.
        foot_y = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0).crop((300, 1100, 900, 1254)).getbbox()
        anchor = [627, 1100 + foot_y[3]] if '/' not in key and foot_y else [627, 627]
        anchor = anchors.get(key, anchor)
        originals[key] = {'file': f'originals/{key}.png', 'size': list(image.size),
                          'anchor': anchor, 'visible_alpha128_bbox': list(visible), 'sha256': digest(target)}
    clips = {}
    contract = {'version': 1, 'sprites': {}, 'single_images': {}}
    specs = {**plan['characters'], **plan['vfx']}
    for name, spec in specs.items():
        character = name in plan['characters']
        keys = spec['poses'] if character else [f"{spec['source_key']}/{i:03}" for i in range(spec['frame_count'])]
        anchor = [896, 1536] if character else [896, 896]
        count = len(keys)
        cols = 2 if count % 2 == 0 else 3
        contract['sprites'][name] = {'frame_width': CELL, 'frame_height': CELL,
                                    'columns': cols, 'rows': count // cols,
                                    'order': ['play'], 'animations': {'play': count}}
        frames = []
        for index, key in enumerate(keys):
            image = Image.open(assets[key])
            source_anchor = originals[key]['anchor']
            offset = [anchor[i] - source_anchor[i] for i in range(2)]
            assert all(v >= 0 for v in offset)
            assert all(offset[i] + image.size[i] <= CELL for i in range(2))
            padded = Image.new('RGBA', (CELL, CELL))
            padded.paste(image, tuple(offset))  # no mask: preserve every RGBA byte
            assert padded.crop((*offset, offset[0] + image.width, offset[1] + image.height)).tobytes() == image.tobytes()
            path = FRAMES / name / 'play' / f'{index:03}.png'
            path.parent.mkdir(parents=True, exist_ok=True)
            padded.save(path)
            frames.append({'index': index, 'original': key, 'offset': offset,
                           'duration_ms': spec['durations_ms'][index]})
        clips[name] = {**spec, 'frame_count': count, 'canvas': [CELL, CELL],
                       'anchor': anchor, 'loop': spec.get('loop', False), 'frames': frames}
        pages = {}
        for frame in frames:
            key = frame['original']
            page = pages.setdefault(key, {'image': originals[key]['file'], 'frames': []})
            ox, oy = frame['offset']
            page['frames'].append({'filename': f"{name}/{frame['index']:03}",
                                  'frame': {'x': 0, 'y': 0, 'w': 1254, 'h': 1254},
                                  'rotated': False, 'trimmed': True,
                                  'spriteSourceSize': {'x': ox, 'y': oy, 'w': 1254, 'h': 1254},
                                  'sourceSize': {'w': CELL, 'h': CELL}})
        write(OUT / f'{name}.atlas.json', {'textures': list(pages.values()),
              'meta': {'app': 'dual-element lossless package', 'format': 'RGBA8888', 'scale': '1'}})
    pack_frames.CONTRACT = contract
    manifest = pack_frames.pack_all(FRAMES, OUT / 'sheets')
    validate_sprites.CONTRACT = contract
    validate_sprites.OUT = OUT / 'sheets'
    validate_sprites.FRAMES = FRAMES
    validate_sprites.verify()
    write(SOURCE / 'package-contract.json', contract)
    write(SOURCE / 'provenance.json', {'generator': 'built-in image_gen',
          'reference': 'user-supplied; character/design rights not independently established',
          'reference_sha256': digest(SOURCE / 'reference.png'), 'entries': provenance})
    write(OUT / 'animations.json', {'version': 1, 'pixel_policy': plan['quality'],
          'direction': plan['canonical_direction'], 'status_contract': plan['status_contract'],
          'originals': originals, 'clips': clips})
    REVIEW.mkdir(parents=True, exist_ok=True)
    for name, clip in clips.items():
        previews = []
        for frame in clip['frames']:
            preview = Image.open(FRAMES / name / 'play' / f"{frame['index']:03}.png")
            preview = preview.resize((384, 384), Image.Resampling.NEAREST)
            previews.append(preview)
        previews[0].save(REVIEW / f'{name}.preview.png', save_all=True,
                         append_images=previews[1:], duration=clip['durations_ms'],
                         loop=0, disposal=0, blend=0)
    for category, names in [('characters', list(plan['characters'])), ('vfx', list(plan['vfx']))]:
        width, height = 240, 260
        preview = Image.new('RGB', (width * (8 if category == 'characters' else 3), height * len(names)), '#151729')
        draw = ImageDraw.Draw(preview)
        for row, name in enumerate(names):
            for frame in manifest['sprites'][name]['frames']:
                index = frame['index']
                image = Image.open(FRAMES / name / 'play' / f'{index:03}.png')
                image.thumbnail((230, 230), Image.Resampling.NEAREST)  # review only
                x, y = index * width, row * height
                preview.paste(image, (x + 5, y + 22), image)
                draw.text((x + 5, y + 3), f'{name.replace("kirito_wave_", "")} {index}', fill='white')
        preview.save(REVIEW / f'{category}.png')
    write(OUT / 'validation.json', {'originals_byte_identical': len(originals),
          'frames_pixel_identical': sum(len(c['frames']) for c in clips.values()),
          'sheets': len(clips), 'gameplay_integration': 'not performed; assets-only scope'})
    print(f'PASS {len(originals)} original PNG pages, {len(clips)} clips; no resizing or quantization')


if __name__ == '__main__':
    build()
