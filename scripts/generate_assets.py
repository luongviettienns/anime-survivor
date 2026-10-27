"""Build the complete pixel-art asset set (Naruto Shippuden hero, Rasengan orb, Rogue Shinobi enemies, environment)."""
from __future__ import annotations
from PIL import Image, ImageDraw
from pack_frames import ROOT, CONTRACT, pack_all
from naruto_shippuden_art import (
    draw_naruto_idle,
    draw_naruto_walk,
    draw_rasengan_orb,
    draw_rogue_ninja_enemy,
)

FRAME_ROOT = ROOT / 'art/frames'
OUT = ROOT / 'public/assets'


def pixel_canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def draw_hero(frame: int, walking: bool) -> Image.Image:
    return draw_naruto_walk(frame) if walking else draw_naruto_idle(frame)


def draw_enemy(frame: int) -> Image.Image:
    return draw_rogue_ninja_enemy(frame)


def single_images() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_rasengan_orb().save(OUT / 'orb.png')

    gem, d = pixel_canvas((12, 12))
    d.polygon([(5, 1), (9, 4), (8, 8), (5, 10), (2, 7), (2, 4)], fill='#0f172a')
    d.polygon([(5, 2), (8, 4), (7, 8), (5, 9), (3, 6)], fill='#38bdf8')
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
    print('Generated exact-size Naruto Shippuden animation sheets, individual PNG frames, and game assets.')


if __name__ == '__main__':
    main()
