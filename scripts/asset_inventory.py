"""Read existing assets and compose a labelled inventory; never modify game art."""
import csv
import json
from PIL import Image, ImageDraw, ImageFont
from pack_frames import ROOT, CONTRACT

OUT = ROOT / 'art/review'
ASSETS = ROOT / 'public/assets'


def size_text(sizes):
    return ', '.join(f'{w}×{h}' for w, h in sorted(set(sizes)))


def inventory():
    manifest = json.loads((ASSETS / 'sprites.manifest.json').read_text())['sprites']
    records = []
    for name, spec in CONTRACT['sprites'].items():
        meta = manifest[name]
        atlas_path = ASSETS / 'runtime' / name / 'atlas.json'
        if atlas_path.exists():
            atlas = json.loads(atlas_path.read_text())
            paths = [atlas_path.parent / p['image'] for p in atlas['textures']]
        else:
            first = meta['frames'][0]
            paths = [ROOT / 'art/frames' / name / first['animation'] / f"{first['index']:03}.png"]
        sizes = []
        for path in paths:
            with Image.open(path) as image:
                sizes.append(image.size)
        with Image.open(ASSETS / meta['file']) as image:
            sheet = image.size
        target = f"{spec.get('display_width', spec['frame_width'])}×{spec.get('display_height', spec['frame_height'])}"
        if name in ('hero_actions', 'hero_locomotion'):
            target = 'cao 56 px'
        if name == 'rasengan':
            target = 'canvas 96×96 khi bay'
        if name == 'hero':
            target = 'Ẩn / controller vật lý'
        records.append({'name': name, 'kind': 'sprite', 'source': size_text(sizes),
                        'frame': f"{spec['frame_width']}×{spec['frame_height']}",
                        'sheet': size_text([sheet]), 'count': len(meta['frames']),
                        'target': target, 'preview': paths[0]})
    singles = [(name, ASSETS / f'{name}.png') for name in CONTRACT['single_images']]
    singles += [(f'icon/{name}', ASSETS / 'icons' / f'{name}.png') for name in CONTRACT['icons']]
    for name, path in singles:
        with Image.open(path) as image:
            size = size_text([image.size])
        records.append({'name': name, 'kind': 'image', 'source': size, 'frame': size,
                        'sheet': '—', 'count': 1, 'target': 'Theo HUD / map', 'preview': path})
    assert len(records) == len(CONTRACT['sprites']) + len(singles)
    return records


def main():
    records = inventory()
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
    heading = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
    width, cell_h, cols = 1800, 250, 4
    image = Image.new('RGB', (width, 120 + ((len(records)+cols-1)//cols)*cell_h), '#111e29')
    draw = ImageDraw.Draw(image)
    draw.text((22, 12), f'ASSET INVENTORY — {len(records)} mục: 40 sprite + 2 ảnh nền/HUD + 10 icon', font=heading, fill='#fff0d0')
    draw.text((22, 46), 'Gốc = PNG nguồn; Frame = canvas đóng gói; Sheet = toàn bộ spritesheet; mọi kích thước tính bằng px.', font=font, fill='#d7e2ed')
    draw.text((22, 75), 'Mốc hiển thị là quy ước thiết kế; VFX thay đổi theo runtime. Hình nhỏ chỉ là preview, nguồn không bị nén.', font=font, fill='#a9b9c9')
    for i, record in enumerate(records):
        x, y = (i % cols)*(width//cols), 120+(i//cols)*cell_h
        draw.rectangle((x+5, y+3, x+445, y+244), fill='#1c303e', outline='#345367')
        with Image.open(record['preview']) as opened:
            sprite = opened.convert('RGBA')
        box = sprite.getchannel('A').getbbox()
        assert box, record['name']
        sprite = sprite.crop(box)
        sprite.thumbnail((112, 112), Image.Resampling.NEAREST)
        image.paste(sprite, (x+166+(112-sprite.width)//2, y+9+(112-sprite.height)//2), sprite)
        lines = [(record['name'], '#8ee7f2'),
                 (f"Gốc: {record['source']}", '#e9eef3'),
                 (f"Frame: {record['frame']} | {record['count']} frame", '#e9eef3'),
                 (f"Sheet: {record['sheet']}", '#e9eef3'),
                 (f"Mốc hiển thị: {record['target']}", '#f4d18b')]
        for line, (label, color) in enumerate(lines):
            draw.text((x+15, y+122+line*23), label, font=font, fill=color)
    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / 'asset-inventory.png')
    with (OUT / 'asset-inventory.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=[k for k in records[0] if k != 'preview'])
        writer.writeheader()
        writer.writerows({k: v for k, v in row.items() if k != 'preview'} for row in records)
    print(f'Wrote inventory of {len(records)} verified assets to {OUT}')


if __name__ == '__main__':
    main()
