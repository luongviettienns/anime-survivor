"""Compose asset previews from exact manifest rectangles; never author artwork."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
from pack_frames import ROOT

GROUPS = {
    'enemy-aura': ['aura_contact', 'aura_ring', 'aura_outer', 'aura_accent', 'enemy_bolt', 'vfx_telegraph', 'vfx_death', 'boss_blood_slash'],
    'actors': ['hero_actions', 'enemy', 'enemy_shade', 'enemy_mage', 'enemy_elite', 'boss'],
    'base-vfx': ['rasengan', 'orb', 'punch', 'shuriken', 'mine', 'explosion'],
    'evolution-vfx': ['rasenshuriken', 'wind_ground', 'punch_max', 'shuriken_max', 'mine_max', 'explosion_max', 'slash_x'],
}


def render_sheet(keys, out_path, title, scale=3):
    manifest = json.loads((ROOT / 'public/assets/sprites.manifest.json').read_text(encoding='utf-8'))
    records = [(name, entry) for name in keys for entry in manifest['sprites'][name]['frames']]
    cols, cell_w, cell_h = 6, 174, 176
    preview = Image.new('RGB', (cols*cell_w, 50 + ((len(records)+cols-1)//cols)*cell_h), '#152530')
    draw = ImageDraw.Draw(preview)
    draw.text((16, 16), title, fill='#fff0d0')
    for index, (name, entry) in enumerate(records):
        x, y = (index%cols)*cell_w+10, (index//cols)*cell_h+50
        meta = manifest['sprites'][name]
        with Image.open(ROOT / 'public/assets' / meta['file']) as sheet:
            sx, sy, w, h = entry['rect']
            frame = sheet.crop((sx, sy, sx+w, sy+h)).convert('RGBA')
        factor = min(scale, 128/max(w, h))
        thumb = frame.resize((round(w*factor), round(h*factor)), Image.Resampling.NEAREST)
        preview.paste(thumb, (x+(154-thumb.width)//2, y), thumb)
        draw.text((x, y+132), name, fill='#8ee7f2')
        draw.text((x, y+145), f'{entry["animation"]}/{entry["index"]}', fill='#f4d18b')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(out_path)
    print(f'Wrote {out_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT/'art/review')
    args = parser.parse_args()
    for name, keys in GROUPS.items():
        render_sheet(keys, args.output/f'{name}.png', f'ANIME SURVIVOR / {name.upper()} / AI SOURCE ART')
