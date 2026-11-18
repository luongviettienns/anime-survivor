"""Pad original ImageGen pixels; never resize, quantize, crop or change alpha."""
from functools import lru_cache
from PIL import Image
from pack_frames import CONTRACT, ROOT

SOURCE = ROOT / 'art/source/ai-overhaul'
ACTORS = ('enemy', 'enemy_shade', 'enemy_mage', 'enemy_elite', 'boss')
GROUPS = {
    'hero_locomotion': CONTRACT['sprites']['hero_locomotion']['animations'],
    'enemy_bolt': {'pulse': 2}, 'vfx_telegraph': {'charge': 2},
    'vfx_death': {'poof': 2}, 'boss_blood_slash': {'cut': 2},
    **{name: CONTRACT['sprites'][name]['animations'] for name in ACTORS},
    **{'aura_' + layer: {'pulse': 2} for layer in ('ring', 'outer', 'contact', 'accent')},
    'rasengan': {'spin': 2, 'charge': 2, 'hit': 2},
    'orb': {'spin': 2}, 'shuriken': {'spin': 2}, 'mine': {'pulse': 2},
    'kunai': {'cut': 2},
    'slash_x': {'cut': 2}, 'explosion': {'boom': 3},
    'punch': {'hit': 2}, 'hero_actions': {'orb': 2, 'slash': 2, 'orbital': 2, 'mine': 2},
    'tree': {'sway': 1}, 'shrine_plaza': {'gleam': 1},
    'rasenshuriken': {'spin': 2, 'hit': 2}, 'wind_ground': {'burst': 2},
    'punch_max': {'hit': 2}, 'shuriken_max': {'spin': 2},
    'mine_max': {'pulse': 2}, 'explosion_max': {'boom': 3},
}



def source_path(sprite, animation, index):
    if sprite == 'hero_locomotion':
        if animation == 'idle':
            index = (0, 1, 1, 0)[index]
        return SOURCE.parent / 'naruto-ai' / animation / f'{index:03}.png'
    return SOURCE / ('rasengan' if sprite == 'orb' else sprite) / animation / f'{index:03}.png'


def placement(sprite, image):
    spec = CONTRACT['sprites'][sprite]
    width, height = spec['frame_width'], spec['frame_height']
    x, y = (width-image.width)//2, (height-image.height)//2
    box = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    if sprite in ('hero_actions', 'hero_locomotion'):
        y = 1408-box[3]
    elif sprite in ACTORS or sprite in ('aura_outer', 'mine', 'mine_max'):
        y = 1536-box[3]
    elif sprite.startswith('aura_'):
        x, y = width//2-(box[0]+box[2])//2, height//2-(box[1]+box[3])//2
        x, y = min(max(2, x), width-image.width-2), min(max(2, y), height-image.height-2)
    if min(x,y) < 2 or x+image.width > width-2 or y+image.height > height-2:
        raise ValueError(f'Original image needs a larger padding canvas: {sprite} {image.size} {(x,y)}')
    return x, y


@lru_cache(maxsize=2)
def import_frames(sprite: str, animation: str) -> tuple[Image.Image, ...]:
    spec = CONTRACT['sprites'][sprite]
    frames = []
    for index in range(GROUPS[sprite][animation]):
        path = source_path(sprite, animation, index)
        with Image.open(path) as opened:
            image = opened.convert('RGBA')
        if not image.getchannel('A').getbbox() or image.getchannel('A').getextrema()[0] == 255:
            raise ValueError(f'Expected nonempty transparent source: {path}')
        frame = Image.new('RGBA', (spec['frame_width'], spec['frame_height']))
        frame.paste(image, placement(sprite, image))
        frames.append(frame)
    return tuple(frames)


def import_frame(sprite: str, animation: str, index: int) -> Image.Image:
    if sprite not in GROUPS or animation not in GROUPS[sprite]:
        raise ValueError(f'Unknown AI asset {sprite}/{animation}')
    if not 0 <= index < GROUPS[sprite][animation]:
        raise ValueError(f'Invalid AI frame {sprite}/{animation}/{index}')
    return import_frames(sprite, animation)[index].copy()
