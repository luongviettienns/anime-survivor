"""Normalize separately generated Naruto poses using shared crops and a fixed palette."""
from functools import lru_cache
from pathlib import Path
from PIL import Image
from pack_frames import CONTRACT

SOURCE = Path(__file__).resolve().parents[1] / 'art/source/naruto-ai'
SOURCE_COUNTS = {'idle': 2, 'walk': 4, 'walk-down': 2, 'idle-up': 1, 'walk-up': 2, 'idle-side': 1}
COLORS = [
    (17, 19, 29), (34, 35, 46), (51, 51, 65), (77, 74, 85),
    (255, 213, 42), (255, 232, 91), (221, 151, 10),
    (251, 105, 11), (255, 139, 37), (190, 67, 7),
    (255, 201, 163), (236, 166, 122), (160, 101, 73),
    (245, 247, 250), (202, 205, 217), (137, 142, 160),
    (61, 151, 208), (20, 79, 123), (114, 70, 49), (92, 56, 38),
    (223, 65, 77),
]


@lru_cache(maxsize=6)
def _poses(animation: str) -> tuple[Image.Image, ...]:
    count = SOURCE_COUNTS[animation]
    images = []
    boxes = []
    for index in range(count):
        with Image.open(SOURCE / animation / f'{index:03}.png') as opened:
            image = opened.convert('RGBA')
        alpha = image.getchannel('A')
        if alpha.getextrema()[0] == 255:
            raise ValueError('Hero source must have transparency')
        image.putalpha(alpha.point(lambda a: 255 if a >= 128 else 0))
        box = image.getchannel('A').getbbox()
        if not box:
            raise ValueError('Empty hero source')
        images.append(image)
        boxes.append(box)
    if len({image.size for image in images}) != 1:
        raise ValueError('Pose canvases must match within an animation')
    # One crop/scale per animation preserves relative placement and body proportions.
    crop = (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))
    factor = min(28 / (crop[2] - crop[0]), 28 / (crop[3] - crop[1]))
    size = (round((crop[2] - crop[0]) * factor), round((crop[3] - crop[1]) * factor))
    frames = []
    for image in images:
        scaled = image.crop(crop).resize(size, Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (32, 32))
        frame.paste(scaled, ((32 - size[0]) // 2, 30 - size[1]))
        pixels = []
        for r, g, b, a in frame.getdata():
            if a == 0:
                pixels.append((0, 0, 0, 0))
            else:
                color = min(COLORS, key=lambda c: (r-c[0])**2 + (g-c[1])**2 + (b-c[2])**2)
                pixels.append((*color, 255))
        frame.putdata(pixels)
        frames.append(frame)
    if animation.startswith('walk'):
        # Keep the head stable; vertical strides retain their opposing arm swings.
        upper_body = frames[0].crop((0, 0, 32, 21 if animation == 'walk' else 14))
        for frame in frames[1:]:
            frame.paste(upper_body, (0, 0))
    return tuple(frames)


def draw_hero(animation: str, frame: int) -> Image.Image:
    count = CONTRACT['sprites']['hero']['animations'].get(animation, 0)
    if not 0 <= frame < count:
        raise ValueError(f'Invalid hero frame: {animation}/{frame}')
    # Two breathing poses held across four slots; running uses four distinct poses.
    index = (0, 1, 1, 0)[frame] if animation == 'idle' else frame
    return _poses(animation)[index].copy()
