"""Deterministic pixel-art generators for enemy archetypes (Shade, Mage), Boss, and Shinobi weapons."""
from __future__ import annotations
from PIL import Image

PALETTE: dict[str, tuple[int, int, int, int]] = {
    '.': (0, 0, 0, 0),
    'K': (17, 19, 29, 255),      # Crisp dark anime outline
    'B': (31, 36, 55, 255),      # Jet black shinobi cloth
    'D': (53, 62, 92, 255),      # Dark slate cloth highlight
    'P': (88, 28, 135, 255),     # Deep shade purple
    'V': (147, 51, 234, 255),    # Vibrant violet scarf / aura
    'L': (216, 180, 254, 255),   # Lavender eye glow / chakra highlight
    'M': (203, 213, 225, 255),   # Silver steel / mask plate
    'G': (100, 116, 139, 255),   # Gunmetal shadow
    'W': (255, 255, 255, 255),   # Pure white highlight / bandages / blade core
    'S': (255, 219, 181, 255),   # Warm anime skin
    'C': (185, 28, 28, 255),     # Deep crimson robe / cloud
    'R': (239, 68, 68, 255),     # Bright crimson eye / blood flame
    'T': (20, 184, 166, 255),    # Cursed teal chakra / scroll
    'Q': (103, 232, 249, 255),   # Bright cyan wind chakra edge
    'A': (245, 158, 11, 255),    # Amber / gold horn & staff ornament
}


def _render_grid(grid: list[str], size: tuple[int, int]) -> Image.Image:
    w, h = size
    assert len(grid) == h, f"Expected {h} rows, got {len(grid)}"
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(grid):
        assert len(row) == w, f"Row {y} has length {len(row)} != {w}: {row!r}"
        for x, ch in enumerate(row):
            px[x, y] = PALETTE[ch]
    return img


def draw_enemy_shade(frame: int) -> Image.Image:
    """24x24 fast dark-purple assassin ninja silhouette with twin kunai and trailing violet scarf."""
    base = [
        "........................",  # 0
        "........................",  # 1
        "........................",  # 2
        ".......KKKKKKKK.........",  # 3
        ".....KKPPPPPPPPKK.......",  # 4
        "....KPPVVVVVVVVPPK.KKK..",  # 5
        "...KPPBBBBBBBBBBPPKVVVK.",  # 6
        "...KPBGGGGGGGGGGPBKPPPK.",  # 7
        "...KPBSKLVKSSKVLKBPKKKK.",  # 8
        "...KPBSSSSSSSSSSPBK.....",  # 9
        "...KPPVVVVVVVVVVPPK.....",  # 10
        "..KPPBBBBPPPPBBBBPPK....",  # 11
        "..KPBBVPPPPPPPPVBBPK....",  # 12
        ".KWMKBBBBPPPPBBBBKMWK...",  # 13
        ".KGGK.KBBBBBBBBK.KGGK...",  # 14
        "..KK..KPPPPPPPPK..KK....",  # 15
        ".......KBBBBBBK.........",  # 16
        "......KBBKKKKBBK........",  # 17
        ".....KWWK....KWWK.......",  # 18
        ".....KPPK....KPPK.......",  # 19
        ".....KKKK....KKKK.......",  # 20
        "........................",  # 21
        "........................",  # 22
        "........................",  # 23
    ]
    bob = [0, -1, 0, 1][frame % 4]
    shifted = ["." * 24 for _ in range(24)]
    for y in range(3, 21):
        shifted[y + bob] = base[y]
    if frame % 2 == 1:
        shifted[18 + bob] = "....KWWK......KWWK......"
        shifted[19 + bob] = "....KPPK......KPPK......"
        shifted[20 + bob] = "....KKKK......KKKK......"
    return _render_grid(shifted, size=(24, 24))


def draw_enemy_mage(frame: int) -> Image.Image:
    """24x24 crimson/teal cursed sound mage ninja with hooded mantle and chakra staff."""
    base = [
        "........................",  # 0
        "........................",  # 1
        "........................",  # 2
        "......KKKKKKKKKK........",  # 3
        "....KKCCCCCCCCCCKK..KK..",  # 4
        "...KCCRRRRRRRRRRCCKTQQK.",  # 5
        "...KCRBBBBBBBBBBCRKQTQK.",  # 6
        "...KCRBTTTTTTTTBCRKTQQK.",  # 7
        "...KCRBSKQTSSQKSCRK.KAK.",  # 8
        "...KCRBSSSSSSSSBCRK.KAK.",  # 9
        "...KCCRRRRRRRRRRCCK.KAK.",  # 10
        "..KCCCCCTTTTTTCCCCCKKAK.",  # 11
        "..KCCCRCTQWWQTCRCCCCKAK.",  # 12
        "..KCCCCCTTTTTTCCCCCKKAK.",  # 13
        "...KCCCCCCCCCCCCCCK.KAK.",  # 14
        "...KCCCRRRRRRRRCCCK.KAK.",  # 15
        "....KCCCCCCCCCCCCK..KAK.",  # 16
        ".....KKCCCCKKCCCCK..KAK.",  # 17
        "......KWWWWK.KWWWWK.KK..",  # 18
        "......KCCCCK.KCCCCK.....",  # 19
        "......KKKKKK.KKKKKK.....",  # 20
        "........................",  # 21
        "........................",  # 22
        "........................",  # 23
    ]
    bob = [0, -1, 0, 1][frame % 4]
    shifted = ["." * 24 for _ in range(24)]
    for y in range(3, 21):
        shifted[y + bob] = base[y]
    if frame % 2 == 1:
        shifted[18 + bob] = ".....KWWWWK...KWWWWKKK.."
        shifted[19 + bob] = ".....KCCCCK...KCCCCK...."
        shifted[20 + bob] = ".....KKKKKK...KKKKKK...."
    return _render_grid(shifted, size=(24, 24))


def draw_boss(frame: int) -> Image.Image:
    """48x48 imposing Shadow Commander boss with horned war mask and crimson-cloud chakra cloak."""
    row_spec = [
        (0, 3, "."),
        (3, 2, "..........KKKK....................KKKK.........."),
        (5, 2, ".........KAAWMK..KKKKKKKKKKKKKK..KMWAAK........."),
        (7, 2, "........KAAWMMKKBBBBBBBBBBBBBBBBKKMMWAAK........"),
        (9, 2, "........KAWMMBBBBDDDDDDDDDDDDDDBBBBMMWAK........"),
        (11, 2, ".........KKBBBBGGGGGGGGGGGGGGGGGGBBBBKK........."),
        (13, 2, ".........KBBBBGMMMMMMMMMMMMMMMMMMGBBBBK........."),
        (15, 2, ".........KBBBBMWWWWWWWWWWWWWWWWWWMBBBBK........."),
        (17, 2, ".........KBBBBMWWKRLLKWWWWKLLRKWWMBBBBK........."),
        (19, 2, ".........KBBBBMWWWWWWWWWWWWWWWWWWMBBBBK........."),
        (21, 2, "........KCCCCBBBBBBBBBBBBBBBBBBBBBBCCCCK........"),
        (23, 2, "......KKCRRRRCBBBBBBBBBBBBBBBBBBBBCRRRRCKK......"),
        (25, 3, ".....KBBBBBBBBBBBBRRRRBBBBBRRRRBBBBBBBBBBBK....."),
        (28, 3, "....KBBBBVLVBBBBBRWWWWRBBBRWWWWRBBBBBVLVBBBK...."),
        (31, 3, "....KBBBBPPPBBBBBBRRRRBBBBBRRRRBBBBBBPPPBBBK...."),
        (34, 3, ".....KBBBBBBBBBBBBBBBBCRRCBBBBBBBBBBBBBBBBK....."),
        (37, 2, "......KKBBBBBBBBBBBBBCRWWRCBBBBBBBBBBBBBKK......"),
        (39, 2, "........KKKKBBBBBBBBBBCRRCBBBBBBBBBBKKKK........"),
        (41, 2, "...........KWWWWWWK..........KWWWWWWK..........."),
        (43, 1, "...........KBBBBBBK..........KBBBBBBK..........."),
        (44, 1, "...........KKKKKKKK..........KKKKKKKK..........."),
        (45, 3, "."),
    ]
    base: list[str] = []
    for _, count, pat in row_spec:
        row_str = pat * 48 if pat == "." else pat
        base.extend([row_str] * count)

    bob = [0, -1, 0, 1][frame % 4]
    shifted = ["." * 48 for _ in range(48)]
    for y in range(3, 45):
        shifted[y + bob] = base[y]
    if frame % 2 == 1:
        shifted[41 + bob] = ".........KWWWWWWK..............KWWWWWWK........."
        shifted[42 + bob] = ".........KWWWWWWK..............KWWWWWWK........."
        shifted[43 + bob] = ".........KBBBBBBK..............KBBBBBBK........."
        shifted[44 + bob] = ".........KKKKKKKK..............KKKKKKKK........."
    return _render_grid(shifted, size=(48, 48))


def draw_shuriken() -> Image.Image:
    """12x12 4-point steel Wind Demon Shuriken with cyan chakra edge."""
    grid = [
        ".....KK.....",
        "....KQQK....",
        "....KMWK....",
        "..KKKMGKKK..",
        ".KQQMMMMQQK.",
        "KQMWGKKGWWMK",
        "KMWWGKKGWMQK",
        ".KQQMMMMQQK.",
        "..KKKGMKKK..",
        "....KWMK....",
        "....KQQK....",
        ".....KK.....",
    ]
    return _render_grid(grid, size=(12, 12))


def draw_slash() -> Image.Image:
    """32x32 crescent turquoise/white chakra blade slash arc."""
    grid = [
        "................................",  # 0
        "..................KKKKKK........",  # 1
        "...............KKKTTTTTTKK......",  # 2
        ".............KKTTTQQQQQQTTK.....",  # 3
        "...........KKTTQQQWWWWWWQQTK....",  # 4
        "..........KTTQQWWWWWWWWWWWQTK...",  # 5
        ".........KTQQWWWWWWWWWWWWWQQTK..",  # 6
        "........KTQWWWWWWWWWWWWWWWWQTK..",  # 7
        ".......KTQWWWWWWWWWWWQQQTTTKK...",  # 8
        "......KTQWWWWWWWWWQQQTTTKKK.....",  # 9
        ".....KTQWWWWWWWWQQTTKKKK........",  # 10
        "....KTQWWWWWWWQQTTKK............",  # 11
        "....KTQWWWWWWQQTKK..............",  # 12
        "...KTQWWWWWWQQTK................",  # 13
        "...KTQWWWWWWQTK.................",  # 14
        "...KTQWWWWWWQTK.................",  # 15
        "...KTQWWWWWWQTK.................",  # 16
        "...KTQWWWWWWQTK.................",  # 17
        "...KTQWWWWWWQQTK................",  # 18
        "....KTQWWWWWWQQTKK..............",  # 19
        "....KTQWWWWWWWQQTTKK............",  # 20
        ".....KTQWWWWWWWWQQTTKKKK........",  # 21
        "......KTQWWWWWWWWWQQQTTTKKK.....",  # 22
        ".......KTQWWWWWWWWWWWQQQTTTKK...",  # 23
        "........KTQWWWWWWWWWWWWWWWWQTK..",  # 24
        ".........KTQQWWWWWWWWWWWWWQQTK..",  # 25
        "..........KTTQQWWWWWWWWWWWQTK...",  # 26
        "...........KKTTQQQWWWWWWQQTK....",  # 27
        ".............KKTTTQQQQQQTTK.....",  # 28
        "...............KKKTTTTTTKK......",  # 29
        "..................KKKKKK........",  # 30
        "................................",  # 31
    ]
    return _render_grid(grid, size=(32, 32))


def draw_enemy_bolt() -> Image.Image:
    """8x8 crimson/violet dark chakra projectile for ranged mage & boss."""
    grid = [
        "..KKKK..",
        ".KCCCCK.",
        "KCRRRRCK",
        "KCRWWRCK",
        "KCRLWRCK",
        "KCRRRRCK",
        ".KCCCCK.",
        "..KKKK..",
    ]
    return _render_grid(grid, size=(8, 8))
