"""Pack reviewed individual attack poses and deterministic skill VFX, retaining AI originals."""
import json
from PIL import Image, ImageDraw
from pack_frames import ROOT, CONTRACT, pack_sprite

SOURCE = ROOT / 'art/source/melee-attacks'
OUT = ROOT / 'public/assets'
DIRECTIONS = ('down', 'side', 'up')


def build():
    manifest = json.loads((OUT / 'sprites.manifest.json').read_text())
    preview = Image.new('RGBA', (4*256, 6*256), '#162235')
    for row, sprite in enumerate(('enemy', 'enemy_shade')):
        for direction_index, direction in enumerate(DIRECTIONS):
            animation = f'attack-{direction}'
            for index, pose in enumerate(('neutral', 'windup', 'strike', 'neutral')):
                if pose == 'neutral':
                    folder = 'walk' if direction == 'down' else f'walk-{direction}'
                    path = ROOT / 'art/source/ai-overhaul' / sprite / folder / '000.png'
                else:
                    path = SOURCE / sprite / direction / f'{pose}.png'
                with Image.open(path) as opened:
                    image = opened.convert('RGBA')
                box = image.getchannel('A').getbbox()
                image = image.crop(box)
                height = (128, 118, 96, 128)[index] if sprite == 'enemy' else (128, 110, 106, 128)[index]
                width = round(image.width * height / image.height)
                if width > 246:
                    raise ValueError(f'Attack exceeds safe width: {path}, {width}')
                image = image.resize((width, height), Image.Resampling.LANCZOS)
                frame = Image.new('RGBA', (256,256))
                solid = image.getchannel('A').point(lambda value: 255 if value >= 128 else 0).getbbox()
                frame.paste(image, ((256-width)//2, 192-solid[3]))
                dest = ROOT / 'art/frames' / f'{sprite}_attack' / animation / f'{index:03}.png'
                dest.parent.mkdir(parents=True, exist_ok=True)
                frame.save(dest)
                preview.paste(frame, (index*256, (row*3+direction_index)*256), frame)
        key = f'{sprite}_attack'
        manifest['sprites'][key] = pack_sprite(key, ROOT/'art/frames', OUT)
    for key in ('player_skill_hit',):
        for index in range(6):
            frame = Image.new('RGBA', (256,256))
            d = ImageDraw.Draw(frame)
            alpha = 255 - index*33
            for claw in range(3):
                x = 38 + claw*40 + index*3
                d.line([(x,55),(x+22,103),(x+50,176)], fill=(255,182,164,alpha), width=max(2,9-index))
                d.line([(x+2,55),(x+24,103),(x+52,176)], fill=(255,245,248,alpha), width=2)
            path = ROOT/'art/frames'/key/'burst'/f'{index:03}.png'
            path.parent.mkdir(parents=True, exist_ok=True)
            frame.save(path)
        manifest['sprites'][key] = pack_sprite(key, ROOT/'art/frames', OUT)
    (OUT/'sprites.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'art/review').mkdir(exist_ok=True)
    preview.save(ROOT/'art/review/melee-attacks.png')

if __name__ == '__main__':
    build()
