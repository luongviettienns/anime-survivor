"""Pack compact remaining actor clips with the established exact-frame validator."""
from PIL import Image
from actor_v3_art import GAME, ROOT, OLD, import_poses, read, write
import pack_frames
import validate_sprites
from export_actor_clips import source_path

CELL, ANCHOR = 2048, [1024, 1536]

def specs():
    result = {'kirito_run_right': ('kirito', 'right', ['run_contact_r', 'run_contact_l'], [140, 140], True)}
    for direction in ['left', 'right']:
        for action, poses, durations in [
            ('hit', ['neutral', 'hit', 'neutral'], [35, 85, 80]),
            ('death', ['neutral', 'hit', 'fallen'], [45, 100, 220]),
            ('basic', ['neutral', 'ice_cut', 'neutral', 'dark_cut', 'neutral'], [90, 70, 80, 70, 100]),
            ('lv1', ['neutral', 'ice_cut', 'neutral'], [180, 90, 165]),
            ('lv2', ['neutral', 'ice_cut', 'neutral', 'dark_cut', 'neutral'], [180, 90, 180, 90, 120]),
            ('lv3', ['neutral', 'dual_cross', 'neutral'], [280, 120, 140]),
        ]:
            result[f'kirito_{action}_{direction}'] = ('kirito', direction, poses, durations, False)
    result['boss_death_down'] = ('boss', 'down', ['neutral', 'hit', 'fallen'], [45, 100, 240], False)
    return result

def pack_clips(specifications, records, output_root=ROOT):
    config_path = GAME / 'src/game/config/actorClips.json'
    config = read(config_path)
    contract = {'version': 1, 'sprites': {}, 'single_images': {}}
    frames_root, sheets = output_root / 'frames', output_root / 'sheets'
    metadata = {}
    for name, (key, direction, poses, durations, loop) in specifications.items():
        scale = config[f'{key}_idle_{direction}' if key == 'kirito' else 'boss_hit_down']['scale']
        frames = []
        for index, pose in enumerate(poses):
            entry = records[key, direction, pose]
            native = source_path(entry['original'])
            with Image.open(native) as source:
                anchor = entry['source_anchor']
                offset = [ANCHOR[i] - anchor[i] for i in range(2)]
                if min(offset) < 1 or any(offset[i] + source.size[i] >= CELL for i in range(2)):
                    raise ValueError(f'{name}/{pose}: source cannot fit padded canvas')
                page, slot = divmod(index, 4)
                page_name = f'{name}_page{page}'
                count = min(4, len(poses) - page * 4)
                columns = 2 if count % 2 == 0 else count
                contract['sprites'][page_name] = {'frame_width': CELL, 'frame_height': CELL,
                    'columns': columns, 'rows': count // columns, 'order': ['play'], 'animations': {'play': count}}
                padded = Image.new('RGBA', (CELL, CELL))
                padded.paste(source, tuple(offset))
                if padded.crop((offset[0], offset[1], offset[0] + source.width, offset[1] + source.height)).tobytes() != source.tobytes():
                    raise ValueError(f'{name}/{pose}: pixel mismatch')
                target = frames_root / page_name / 'play' / f'{slot:03}.png'
                target.parent.mkdir(parents=True, exist_ok=True)
                padded.save(target)
                frames.append({'image': entry['original'], 'origin': [anchor[i] / source.size[i] for i in range(2)]})
        config[name] = {'entity': key, 'action': name.split('_')[1], 'direction': direction,
                        'scale': scale, 'durations': durations, 'loop': loop, 'frames': frames}
        metadata[name] = config[name]
    pack_frames.CONTRACT = contract
    pack_frames.pack_all(frames_root, sheets)
    validate_sprites.CONTRACT, validate_sprites.FRAMES, validate_sprites.OUT = contract, frames_root, sheets
    validate_sprites.verify()
    write(output_root / 'contract.json', contract)
    write(output_root / 'clips.json', metadata)
    transitions = GAME / 'art/source/kirito-transitions/clips.json'
    if output_root == ROOT and transitions.is_file():
        config.update(read(transitions))
    write(config_path, config)
    print(f'Packed {len(metadata)} compact clips; canonical timing/origin metadata updated')


def build():
    fresh = import_poses()
    expected = [('kirito', 'right', pose) for pose in ['run_contact_l', 'run_contact_r']]
    expected += [('kirito', direction, pose) for direction in ['left', 'right']
                 for pose in ['hit', 'fallen', 'ice_cut', 'dark_cut', 'dual_cross']]
    expected += [('boss', 'down', 'fallen')]
    missing = [identity for identity in expected if identity not in fresh]
    if missing:
        raise ValueError(f'Missing required poses: {missing}')
    retained = read(OLD / 'source/provenance.json')['records']
    records = {(e['key'], e['direction'], e['pose']): e for e in retained}
    records.update(fresh)
    pack_clips(specs(), records)

if __name__ == '__main__':
    build()
