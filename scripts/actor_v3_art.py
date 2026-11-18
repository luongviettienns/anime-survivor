"""Preserve and measure single-image actor-v3 poses; never modify native pixels."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

GAME = Path(__file__).resolve().parents[1]
ROOT = GAME / 'art/source/actor-v3'
OLD = GAME / 'art/source/actor-v2'

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def import_poses():
    records = {}
    for path in sorted((ROOT / 'source').glob('*.json')):
        entry = read(path)
        if 'pose' not in entry:
            continue
        key, direction, pose = entry['key'], entry['direction'], entry['pose']
        target = ROOT / 'source/originals' / key / direction / f'{pose}.png'
        source = Path(entry['path'])
        if not source.is_file():
            source = target
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != target.resolve():
            shutil.copyfile(source, target)
        if source.read_bytes() != target.read_bytes():
            raise ValueError(f'{path}: original copy mismatch')
        with Image.open(target) as image:
            if image.mode != 'RGBA':
                raise ValueError(f'{path}: expected RGBA')
            mask = image.getchannel('A').point(lambda alpha: 255 if alpha >= 128 else 0)
            box = mask.getbbox()
            if not box or min(box[:2]) <= 0 or box[2] >= image.width or box[3] >= image.height:
                raise ValueError(f'{path}: empty/clipped source {box}')
            left, right = int(image.width * .25), int(image.width * .75)
            body = mask.crop((left, 0, right, image.height)).getbbox()
            anchor = [image.width // 2, body[3] if key == 'kirito' else box[3]]
            if 'anchor' in entry:
                anchor = entry['anchor']
            if not all(0 < anchor[i] < image.size[i] for i in range(2)):
                raise ValueError(f'{path}: invalid ground anchor')
            entry.update({'size': list(image.size), 'source_anchor': anchor,
                          'alpha_bbox': list(box), 'original': f'v3/{key}/{direction}/{pose}.png',
                          'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        records[key, direction, pose] = entry
    write(ROOT / 'source/provenance.json', {'tool': 'built-in image_gen', 'one_pose_per_image': True,
          'originals_unchanged': True, 'records': list(records.values())})
    return records

if __name__ == '__main__':
    print(f'Imported {len(import_poses())} unchanged native poses')
