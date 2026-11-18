"""Export/check native actor originals and exact Dash atlas pages without image edits."""
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art/source/actor-v2/site/assets/actor-v2'
TARGET = ROOT / 'public/assets/actor-v2'

def export(check=False):
    clips = json.loads((ROOT / 'src/game/config/actorClips.json').read_text(encoding='utf-8'))
    paths = {f['image'] for c in clips.values() for f in c['frames']}
    for direction in ['down', 'up', 'left', 'right']:
        name = f'kirito_dash_{direction}.atlas.json'
        paths.add(name)
        atlas = json.loads((SOURCE / name).read_text(encoding='utf-8'))
        paths.update(page['image'] for page in atlas['textures'])
    for name in sorted(paths):
        source = ROOT / 'art/source/actor-v3/source/originals' / name[3:] if name.startswith('v3/') else SOURCE / name
        target = TARGET / name
        if source.suffix == '.png':
            with Image.open(source) as image:
                if image.mode != 'RGBA':
                    raise ValueError(f'{source}: expected native RGBA')
        if not check:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        if source.read_bytes() != target.read_bytes():
            raise ValueError(f'{target}: differs from preserved native source')
    print(f'PASS {len(paths)} native actor files: originals/atlas bytes identical')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    export(parser.parse_args().check)
