"""Export Lanczos runtime derivatives; retain original sources and archival frames."""
import json

from PIL import Image
from ai_asset_import import GROUPS, source_path, placement
from pack_frames import CONTRACT, ROOT


def export_originals():
    scales = {}
    ranges = {}
    anchors = json.loads((ROOT / 'docs/CAST_HAND_ANCHORS.json').read_text())['sprites']
    for sprite, animations in GROUPS.items():
        spec = CONTRACT['sprites'][sprite]
        scales[sprite] = spec['display_width'] / 1280
        if sprite in ('hero_actions', 'hero_locomotion', 'rasengan'):
            scales[sprite] = 1 / 16
        scales[sprite] *= 8
        folder = ROOT / 'public/assets/runtime' / sprite
        folder.mkdir(parents=True, exist_ok=True)
        textures = []
        pages = {}
        frame_number = 0
        ranges[sprite] = {}
        for animation, count in animations.items():
            ranges[sprite][animation] = list(range(frame_number, frame_number+count))
            for index in range(count):
                source = source_path(sprite, animation, index)
                filename = f'{animation}-{index:03}.png'
                with Image.open(source) as image:
                    width, height = image.size
                    rgba = image.convert('RGBA')
                    x, y = placement(sprite, rgba)
                    box = rgba.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
                    opaque_height = box[3]-box[1]
                    display_scale = scales[sprite] / 8
                    if sprite == 'hero_locomotion':
                        display_scale = 56 / opaque_height
                    elif sprite == 'hero_actions':
                        display_scale = min(display_scale, 56 / opaque_height)
                    elif sprite in ('enemy', 'enemy_shade', 'enemy_mage', 'enemy_elite', 'boss'):
                        display_scale = spec['display_height'] / opaque_height
                    rgba.resize((round(width/8), round(height/8)), Image.Resampling.LANCZOS).save(folder / filename)
                frame = {'filename': str(frame_number), 'rotated': False, 'trimmed': True,
                         'frame': {'x': 0, 'y': 0, 'w': width, 'h': height},
                         'spriteSourceSize': {'x': x, 'y': y, 'w': width, 'h': height},
                         'sourceSize': {'w': spec['frame_width'], 'h': spec['frame_height']},
                         'animation': animation, 'poseIndex': index,
                         'opaqueHeight': opaque_height, 'displayScale': display_scale,
                         'opaqueBounds': [box[0]+x, box[1]+y, box[2]+x, box[3]+y]}
                points = anchors.get(sprite, {}).get(animation, [])
                if points:
                    frame['hands'] = [[x+width*u, y+height*v] for u, v in points[index]]
                frame['displayScale'] *= 8
                frame['opaqueHeight'] /= 8
                frame['opaqueBounds'] = [value/8 for value in frame['opaqueBounds']]
                for key in ('frame', 'spriteSourceSize', 'sourceSize'):
                    frame[key] = {k: round(v/8) for k, v in frame[key].items()}
                if 'hands' in frame:
                    frame['hands'] = [[u/8, v/8] for u, v in frame['hands']]
                # Repeated idle holds share one original GPU texture, retaining frame timing.
                if source not in pages:
                    pages[source] = {'image': filename, 'frames': []}
                    textures.append(pages[source])
                pages[source]['frames'].append(frame)
                frame_number += 1
        (folder / 'atlas.json').write_text(json.dumps({'textures': textures}, indent=2)+'\n')
    config = 'export const ART_SCALE: Readonly<Record<string, number>> = '+json.dumps(scales, indent=2)+';\n'
    config += 'export const ART_FRAMES: Readonly<Record<string, Readonly<Record<string, readonly number[]>>>> = {\n'
    config += ',\n'.join('  '+json.dumps(key)+': '+json.dumps(value) for key, value in ranges.items())+'\n};\n'
    config += 'export const AI_ART_KEYS = new Set(Object.keys(ART_SCALE));\n'
    (ROOT / 'src/game/config/artDisplay.ts').write_text(config)
