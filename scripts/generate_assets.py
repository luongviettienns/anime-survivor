"""Build the complete prototype pixel-art asset set, without image models or paid APIs."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
from pack_frames import ROOT, CONTRACT, pack_all

FRAME_ROOT = ROOT / 'art/frames'
OUT = ROOT / 'public/assets'
C = {'outline': '#1a1d35', 'hair': '#8b54d1', 'hair_high': '#d09afb',
     'skin': '#ffd5b5', 'coat': '#282d67', 'coat_high': '#7261c2',
     'eyes': '#64e6f4', 'ribbon': '#ff729e', 'sword': '#e6ffff',
     'enemy': '#764bb3', 'enemy_shadow': '#42286c', 'enemy_eye': '#fc83cb'}


def pixel_canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def draw_hero(frame: int, walking: bool) -> Image.Image:
    img, d = pixel_canvas((32, 32))
    sway = [0, 1, 0, -1][frame]
    bob = [0, -1, 0, 0][frame] if walking else [0, 0, -1, 0][frame]
    stride = [1, 0, -1, 0][frame] if walking else 0
    y = bob
    # Body silhouette, shoes, coat, and arms.
    d.rectangle((11 + stride, 26 + y, 14 + stride, 29 + y), fill=C['outline'])
    d.rectangle((17 - stride, 26 + y, 20 - stride, 29 + y), fill=C['outline'])
    d.rectangle((9, 17 + y, 22, 26 + y), fill=C['outline'])
    d.polygon([(10, 19+y), (21, 19+y), (23, 26+y), (9, 26+y)], fill=C['coat'])
    d.rectangle((13, 19 + y, 19, 24 + y), fill=C['coat_high'])
    d.rectangle((8, 20 + y, 11, 25 + y), fill=C['skin'])
    d.rectangle((21, 19 + y, 24, 24 + y), fill=C['skin'])
    # Long violet hair and face, large anime silhouette.
    d.rectangle((9, 6 + y, 22, 19 + y), fill=C['outline'])
    d.rectangle((10, 7 + y, 21, 19 + y), fill=C['hair'])
    d.rectangle((11, 10 + y, 20, 18 + y), fill=C['skin'])
    d.rectangle((12, 13 + y, 13, 14 + y), fill=C['eyes'])
    d.rectangle((18, 13 + y, 19, 14 + y), fill=C['eyes'])
    d.rectangle((11, 7 + y, 20, 11 + y), fill=C['hair'])
    d.rectangle((11, 8 + y, 18, 8 + y), fill=C['hair_high'])
    d.rectangle((9, 13 + y, 11, 22 + y), fill=C['hair'])
    d.rectangle((21, 13 + y, 23, 22 + y), fill=C['hair'])
    d.rectangle((21 + sway, 16 + y, 25 + sway, 18 + y), fill=C['ribbon'])
    d.rectangle((24 + sway, 17 + y, 27 + sway, 19 + y), fill=C['ribbon'])
    return img


def draw_enemy(frame: int) -> Image.Image:
    img, d = pixel_canvas((24, 24))
    bob = [0, -1, 0, 1][frame]
    d.ellipse((4, 5 + bob, 19, 21 + bob), fill=C['enemy_shadow'])
    d.ellipse((5, 5 + bob, 18, 19 + bob), fill=C['enemy'])
    d.rectangle((7, 11 + bob, 9, 13 + bob), fill=C['enemy_eye'])
    d.rectangle((14, 11 + bob, 16, 13 + bob), fill=C['enemy_eye'])
    d.rectangle((10, 16 + bob, 13, 17 + bob), fill=C['outline'])
    return img


def single_images() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    orb, d = pixel_canvas((8, 8))
    d.ellipse((1, 1, 6, 6), fill='#61e5ff')
    d.rectangle((3, 2, 4, 4), fill='#ffffff')
    orb.save(OUT / 'orb.png')
    gem, d = pixel_canvas((12, 12))
    d.polygon([(5, 1), (9, 4), (8, 8), (5, 10), (2, 7), (2, 4)], fill='#39398e')
    d.polygon([(5, 2), (8, 4), (7, 8), (5, 9), (3, 6)], fill='#9dedec')
    d.rectangle((4, 3, 5, 5), fill='#ffffff')
    gem.save(OUT / 'gem.png')
    grass, d = pixel_canvas((32, 32))
    d.rectangle((0, 0, 31, 31), fill='#1d3944')
    for i in range(30):
        x, y = (i * 17 + 3) % 30, (i * 23 + 7) % 30
        d.point((x, y), fill='#30585b' if i % 3 else '#2b4851')
    grass.save(OUT / 'grass.png')
    tree, d = pixel_canvas((32, 40))
    d.rectangle((14, 28, 18, 37), fill='#744761')
    d.rectangle((11, 29, 20, 30), fill='#4b3549')
    d.polygon([(16, 3), (26, 16), (22, 16), (29, 29), (3, 29), (10, 16), (6, 16)], fill='#152b45')
    d.polygon([(16, 5), (23, 16), (20, 16), (26, 27), (6, 27), (12, 16), (9, 16)], fill='#368278')
    d.rectangle((12, 16, 18, 17), fill='#68b9a5')
    d.rectangle((9, 25, 19, 26), fill='#4ba08b')
    tree.save(OUT / 'tree.png')


def main() -> None:
    for sprite, spec in CONTRACT['sprites'].items():
        for animation in spec['order']:
            directory = FRAME_ROOT / sprite / animation
            directory.mkdir(parents=True, exist_ok=True)
            for i in range(spec['animations'][animation]):
                image = draw_hero(i, animation == 'walk') if sprite == 'hero' else draw_enemy(i)
                image.save(directory / f'{i:03}.png')
    pack_all(FRAME_ROOT, OUT)
    single_images()
    print('Generated exact-size animation sheets, individual PNG frames, and 4 other original assets.')


if __name__ == '__main__':
    main()
