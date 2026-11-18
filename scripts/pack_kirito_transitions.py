"""Pack authored Kirito anticipation/follow-through without changing release offsets."""
from actor_v3_art import GAME, OLD, ROOT as V3, import_poses, read
from pack_actor_v3 import pack_clips

ROOT = GAME / 'art/source/kirito-transitions'

def specs():
    clips = {}
    for direction in ['left', 'right']:
        for action, poses, durations in [
            ('basic', ['neutral', 'ice_windup', 'ice_cut', 'ice_follow', 'dark_windup', 'dark_cut', 'dark_follow', 'neutral'], [35,55,70,40,40,70,40,60]),
            ('lv1', ['neutral', 'ice_windup', 'ice_cut', 'ice_follow', 'neutral'], [40,140,70,125,60]),
            ('lv2', ['neutral', 'ice_windup', 'ice_cut', 'ice_follow', 'dark_windup', 'dark_cut', 'dark_follow', 'neutral'], [40,140,70,60,140,70,80,60]),
            ('lv3', ['neutral', 'dual_windup', 'dual_cross', 'dual_follow', 'neutral'], [40,240,100,100,60]),
        ]:
            clips[f'kirito_{action}_{direction}'] = ('kirito', direction, poses, durations, False)
    return clips

def build():
    fresh = import_poses(ROOT, 'transitions')
    expected = [('kirito', d, f'{kind}_{pose}') for d in ['left','right']
                for kind in ['ice','dark','dual'] for pose in ['windup','follow']]
    missing = [key for key in expected if key not in fresh]
    if missing:
        raise ValueError(f'Missing transition poses: {missing}')
    retained = read(OLD / 'source/provenance.json')['records'] + read(V3 / 'source/provenance.json')['records']
    records = {(e['key'],e['direction'],e['pose']): e for e in retained}
    records.update(fresh)
    pack_clips(specs(), records, ROOT)

if __name__ == '__main__':
    build()
