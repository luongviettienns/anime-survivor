"""Deterministic pixel-art generator for Naruto Shippuden (Option 2) and Rogue Shinobi enemy."""
from __future__ import annotations
from PIL import Image

PALETTE: dict[str, tuple[int, int, int, int]] = {
    '.': (0, 0, 0, 0),
    'K': (17, 19, 29, 255),      # Crisp dark anime outline
    'B': (31, 36, 55, 255),      # Shippuden jet black (headband, yoke, sandals)
    'D': (53, 62, 92, 255),      # Charcoal highlight on black cloth
    'Y': (255, 207, 0, 255),     # Iconic golden blonde hair
    'H': (255, 243, 109, 255),   # Bright yellow hair highlight
    'A': (217, 130, 0, 255),     # Warm amber hair shadow
    'M': (203, 213, 225, 255),   # Silver forehead protector plate
    'W': (255, 255, 255, 255),   # Pure white (sclera, metal glint, bandages, zipper)
    'G': (71, 85, 105, 255),     # Steel shadow / Konoha leaf symbol / bandage shade
    'S': (255, 219, 181, 255),   # Warm peach anime skin
    'N': (229, 169, 124, 255),   # Skin shadow
    'C': (156, 90, 48, 255),     # Cheek whisker marks & mouth
    'E': (0, 153, 255, 255),     # Uzumaki bright azure blue eyes
    'O': (249, 99, 2, 255),      # Shippuden vibrant orange jacket & pants
    'L': (255, 140, 36, 255),    # Bright orange highlight
    'V': (184, 55, 0, 255),      # Deep orange fold shadow
    'R': (239, 68, 68, 255),     # Red Uzumaki swirl crest / Sharingan red
}

IDLE_BASE = [
    "................................",  # 0
    ".........KK....KK....KK.........",  # 1
    "........KHYK..KHYK..KHYK........",  # 2
    "......KKHYYHKKHYYHKKHYYHKK......",  # 3
    ".....KHHYYYYYYYYYYYYYYYYHHK.....",  # 4
    "....KHYYYYHYYYYYYYYYYHYYYYHK....",  # 5
    ".....KKAAYYYYYYYYYYYYYYAAKK.....",  # 6
    "......KHYAYYYAKKKKKKAYYHYK......",  # 7
    "....KKKAYAKBBBBBBBBBBBBKAYK.....",  # 8
    "..KKBBK.KBBMWMMMMGWMMMWBBK......",  # 9
    ".KBBBBK.KBBMMMMMMMMMMMMBBK......",  # 10
    "..KKKK..KYAKKKKSSSSKKKKAYK......",  # 11
    "........KAKSWESSSSSSWESKAK......",  # 12
    ".........KKSWESSSSSSWESKK.......",  # 13
    "...........KCSSSSSSSSCK.........",  # 14
    "...........KCSSNCCSSSCK.........",  # 15
    "............KNNSSSSNNK..........",  # 16
    "...........KBBBBWWBBBBK.........",  # 17
    "..........KDBBBBBBBBBBDK........",  # 18
    ".........KDBBBBBWWBBBBBDRK......",  # 19
    "........KOBBBOOOLWLOOOBBBOK.....",  # 20
    "........KOOOOLOOOOOOOLOOOOK.....",  # 21
    "........KVOOKOOOOOOOOOKOOVK.....",  # 22
    "........KSNK.KOOOVOOOK.KNSK.....",  # 23
    ".........KK..KVVOKOVVK..KK......",  # 24
    ".............KOOOKOOOK..........",  # 25
    "............KOOOOKWWWWK.........",  # 26
    "............KOVVOKWGBBK.........",  # 27
    "............KWWWWKWWWWK.........",  # 28
    "...........KBBBBBKBBBBBK........",  # 29
    "...........KBBSSK.KBBSSK........",  # 30
    "................................",  # 31
]

WALK_FRAMES = [
    # Frame 0: Naruto Run - Wide Stride A (Right leg forward, Left leg back, Diagonal swept-back arms)
    [
        "................................",  # 0
        "................................",  # 1
        "...........KK....KK....KK.......",  # 2
        ".........KKHYK..KHYK..KHYK......",  # 3
        ".......KKHYYYYKKHYYYKKHYYK......",  # 4
        "......KHHYYYYYYYYYYYYYYYYHK.....",  # 5
        ".....KHYYYYHYYYYYYYYHYYYYAK.....",  # 6
        "......KKAAYYYYYYYYYYYYYAAK......",  # 7
        "...KKKK.KAYAKBBBBBBBBBBBBK......",  # 8
        ".KKBBBBKK.KBBMWMMMMGWMMWBBK.....",  # 9
        ".KBBBBBBK.KBBMMMMMMMMMMMBBK.....",  # 10
        "..KKKKKK...KYAKKKKSSKKKKAYK.....",  # 11
        "...........KAKSSWESSSWESKAK.....",  # 12
        "............KKCSWESSSWESCKK.....",  # 13
        "...KKK........KCSSSSNCCSK.......",  # 14
        "..KSSNK......KBBBBWWBBBBK.......",  # 15
        "...KOOOKK...KDBBBBBBBBBBDK......",  # 16
        "....KOOOOKKKDBBBRRBBBBBBBDK.....",  # 17
        ".....KVOOBBBBBBRRBOOOOBBBK......",  # 18
        "......KKKKKKKOOOOOOOOOOOK.......",  # 19
        ".............KOOOOOOOOLOK.......",  # 20
        ".............KOOOVOOOOOOK.......",  # 21
        ".............KVVOOOOOOVVK.......",  # 22
        "...........KKOOOKKKKOOOOK.......",  # 23
        ".........KKOOOOK...KWWWWK.......",  # 24
        "........KOOOOOK....KWGBBK.......",  # 25
        ".......KOOOVVK......KWWWWK......",  # 26
        "......KWWWWK........KBBBBBK.....",  # 27
        ".....KBBBBBK.........KBBSSK.....",  # 28
        ".....KBBSSK...........KKKK......",  # 29
        "......KKKK......................",  # 30
        "................................",  # 31
    ],
    # Frame 1: Naruto Run - Down / Power Drive (Body dips 1px, legs passing, tails whip up)
    [
        "................................",  # 0
        "................................",  # 1
        "................................",  # 2
        "...........KK....KK....KK.......",  # 3
        ".........KKHYK..KHYK..KHYK......",  # 4
        ".......KKHYYYYKKHYYYKKHYYK......",  # 5
        "......KHHYYYYYYYYYYYYYYYYHK.....",  # 6
        "..KKKKKHYYYYHYYYYYYYYHYYYYAK....",  # 7
        ".KBBBBBBKAAYYYYYYYYYYYYYAAK.....",  # 8
        "..KKKKBBBKAYAKBBBBBBBBBBBBK.....",  # 9
        ".....KKKK..KBBMWMMMMGWMMWBBK....",  # 10
        "...........KBBMMMMMMMMMMMBBK....",  # 11
        "............KYAKKKKSSKKKKAYK....",  # 12
        "...KKK......KAKSSWESSSWESKAK....",  # 13
        "..KSSNK......KKCSWESSSWESCKK....",  # 14
        "...KOOOKK......KCSSSSNCCSK......",  # 15
        "....KOOOOKK...KBBBBWWBBBBK......",  # 16
        ".....KVOOBBKKKDBBBBBBBBBBDK.....",  # 17
        "......KKKKBBBBBBBRRBBBBBBBDK....",  # 18
        "..........KKKKBBRRBOOOOBBBK.....",  # 19
        "..............KOOOOOOOOOOOK.....",  # 20
        "..............KOOOOOOOOLOK......",  # 21
        "..............KOOOVOOOOOOK......",  # 22
        "..............KVVOOOOOOVVK......",  # 23
        "..............KOOOKOOOOOK.......",  # 24
        ".............KOOOOKWWWWK........",  # 25
        ".............KOVVOKWGBBK........",  # 26
        ".............KWWWWKWWWWK........",  # 27
        "............KBBBBBKBBBBBK.......",  # 28
        "............KBBSSK.KBBSSK.......",  # 29
        ".............KKKK...KKKK........",  # 30
        "................................",  # 31
    ],
    # Frame 2: Naruto Run - Wide Stride B (Left leg forward, Right banded leg kicked high back)
    [
        "................................",  # 0
        "................................",  # 1
        "...........KK....KK....KK.......",  # 2
        ".........KKHYK..KHYK..KHYK......",  # 3
        ".......KKHYYYYKKHYYYKKHYYK......",  # 4
        "......KHHYYYYYYYYYYYYYYYYHK.....",  # 5
        ".....KHYYYYHYYYYYYYYHYYYYAK.....",  # 6
        "......KKAAYYYYYYYYYYYYYAAK......",  # 7
        "........KAYAKBBBBBBBBBBBBK......",  # 8
        "...KKKKKK.KBBMWMMMMGWMMWBBK.....",  # 9
        ".KKBBBBBBKKBBMMMMMMMMMMMBBK.....",  # 10
        ".KBBBBBBK...KYAKKKKSSKKKKAYK....",  # 11
        "..KKKKKK....KAKSSWESSSWESKAK....",  # 12
        ".............KKCSWESSSWESCKK....",  # 13
        "...KKK.........KCSSSSNCCSK......",  # 14
        "..KSSNK.......KBBBBWWBBBBK......",  # 15
        "...KOOOKK....KDBBBBBBBBBBDK.....",  # 16
        "....KOOOOKKKKDBBBRRBBBBBBBDK....",  # 17
        ".....KVOOBBBBBBRRBOOOOBBBK......",  # 18
        "......KKKKKKKOOOOOOOOOOOK.......",  # 19
        ".............KOOOOOOOOLOK.......",  # 20
        ".............KOOOVOOOOOOK.......",  # 21
        ".............KVVOOOOOOVVK.......",  # 22
        "..........KKKWWWWKKKKOOOK.......",  # 23
        "........KKWGBBBWK...KOOOOK......",  # 24
        ".......KWWWWWWK.....KOOOOOK.....",  # 25
        "......KBBBBBK........KOOOVK.....",  # 26
        "......KBBSSK.........KWWWWK.....",  # 27
        ".......KKKK..........KBBBBBK....",  # 28
        "......................KBBSSK....",  # 29
        ".......................KKKK.....",  # 30
        "................................",  # 31
    ],
    # Frame 3: Naruto Run - Airborne Recovery Pass
    [
        "................................",  # 0
        "................................",  # 1
        "...........KK....KK....KK.......",  # 2
        ".........KKHYK..KHYK..KHYK......",  # 3
        ".......KKHYYYYKKHYYYKKHYYK......",  # 4
        "......KHHYYYYYYYYYYYYYYYYHK.....",  # 5
        ".....KHYYYYHYYYYYYYYHYYYYAK.....",  # 6
        "......KKAAYYYYYYYYYYYYYAAK......",  # 7
        "....KKKKKAYAKBBBBBBBBBBBBK......",  # 8
        "..KKBBBBBBKBBMWMMMMGWMMWBBK.....",  # 9
        ".KBBBBBBBBKBBMMMMMMMMMMMBBK.....",  # 10
        "..KKKK.KKK..KYAKKKKSSKKKKAYK....",  # 11
        "............KAKSSWESSSWESKAK....",  # 12
        ".............KKCSWESSSWESCKK....",  # 13
        "................KCSSSSNCCSK.....",  # 14
        "..KKK..........KBBBBWWBBBBK.....",  # 15
        ".KSSNK........KDBBBBBBBBBBDK....",  # 16
        "..KOOOKKKK...KDBBBRRBBBBBBBDK...",  # 17
        "...KOOOOOOBBBBBBRRBOOOOBBBK.....",  # 18
        "....KKVOOBBBBBOOOOOOOOOOOK......",  # 19
        "......KKKKKKK.KOOOOOOOOLOK......",  # 20
        "..............KOOOVOOOOOOK......",  # 21
        "..............KVVOOOOOOVVK......",  # 22
        ".............KOOOOKKKOOOOK......",  # 23
        "............KOOOOOK.KWWWWK......",  # 24
        "...........KOOOVVK..KWGBBK......",  # 25
        "...........KWWWWK...KWWWWK......",  # 26
        "..........KBBBBBK..KBBBBBK......",  # 27
        "..........KBBSSK...KBBSSK.......",  # 28
        "...........KKKK.....KKKK........",  # 29
        "................................",  # 30
        "................................",  # 31
    ],
]


def _render_grid(grid: list[str], size: tuple[int, int] = (32, 32)) -> Image.Image:
    w, h = size
    assert len(grid) == h, f"Expected {h} rows, got {len(grid)}"
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(grid):
        assert len(row) == w, f"Row {y} has length {len(row)} != {w}: {row!r}"
        for x, ch in enumerate(row):
            px[x, y] = PALETTE[ch]
    return img


def draw_naruto_idle(frame: int) -> Image.Image:
    """Generate 4-frame dynamic Idle animation with breathing torso & waving headband tails."""
    grid = [list(r) for r in IDLE_BASE]

    tail_variants = [
        # Frame 0: Neutral tail wave
        {
            8:  "....KKK",
            9:  "..KKBBK",
            10: ".KBBBBK",
            11: "..KKKK.",
        },
        # Frame 1: Wind lifts tails up
        {
            7:  "..KKKK.",
            8:  ".KBBBBK",
            9:  ".KBBBBK",
            10: "..KKKK.",
            11: ".......",
        },
        # Frame 2: Tails whip down in S-curve
        {
            8:  ".....KK",
            9:  "...KKBB",
            10: ".KKBBBB",
            11: ".KBBBBK",
            12: "..KKKK.",
        },
        # Frame 3: Mid-recovery wave
        {
            8:  "...KKKK",
            9:  ".KKBBBB",
            10: ".KBBBBK",
            11: "..KKKK.",
        },
    ]
    for r_idx in range(7, 13):
        for c_idx in range(1, 8):
            if grid[r_idx][c_idx] in ('B', 'K'):
                grid[r_idx][c_idx] = '.'
    for r_idx, pat in tail_variants[frame].items():
        for c_idx, ch in enumerate(pat):
            if ch != '.':
                grid[r_idx][c_idx] = ch

    # Subtle breathing on Frame 1 (arms flex 1px) and Frame 2 (upper body crouches 1px while feet stay planted)
    if frame == 2:
        shifted = [list("." * 32) for _ in range(32)]
        for y in range(2, 25):
            shifted[y] = grid[y - 1][:]
        for y in range(25, 31):
            shifted[y] = grid[y][:]
        grid = shifted

    return _render_grid(["".join(r) for r in grid])


def draw_naruto_walk(frame: int) -> Image.Image:
    """Generate 4-frame Naruto Shippuden Run (forward lean, diagonal swept-back arms, 4-step stride)."""
    return _render_grid(WALK_FRAMES[frame % 4])


def draw_rogue_ninja_enemy(frame: int) -> Image.Image:
    """24x24 Rogue Shadow Shinobi / Akatsuki-cloaked enemy with glowing crimson eyes."""
    base = [
        "........................",  # 0
        "........................",  # 1
        ".......KKKKKKKKKK.......",  # 2
        ".....KKBBBBBBBBBBKK.....",  # 3
        "....KBBBBDDDDDDBBBBK....",  # 4
        "...KBBBGGGGGGGGGGbbBK...",  # 5
        "...KBBGMMMMMMMMMMGBBK...",  # 6
        "...KBBSSSSSSSSSSSSBBK...",  # 7
        "...KBBSKWRKSSKRWKSBBK...",  # 8
        "...KBBSSSSSSSSSSSSBBK...",  # 9
        "...KBBBBBBBBBBBBBBBBK...",  # 10
        "..KBBBBBRRBBBBBRRBBBBK..",  # 11
        "..KBBBBRWRRBBBRWRRBBBK..",  # 12
        "..KBBBBBRRBBBBBRRBBBBK..",  # 13
        "..KBBBBBBBBBBBBBBBBBBK..",  # 14
        "...KBBBBBBBRRBBBBBBBK...",  # 15
        "...KBBBBBBBRWRBBBBBBK...",  # 16
        "....KBBBBBBBBBBBBBBK....",  # 17
        ".....KKBBBBKKBBBBKK.....",  # 18
        "......KWWWWK.KWWWWK.....",  # 19
        "......KBBBBK.KBBBBK.....",  # 20
        "......KKKKKK.KKKKKK.....",  # 21
        "........................",  # 22
        "........................",  # 23
    ]
    # Replace lowercase 'b' with 'B'
    rows = [r.replace('b', 'B') for r in base]
    bob = [0, -1, 0, 1][frame % 4]
    shifted = ["." * 24 for _ in range(24)]
    for y in range(2, 22):
        ny = y + bob
        if 1 <= ny <= 22:
            shifted[ny] = rows[y]
    # Animate feet stride on frames 1 and 3
    if frame % 2 == 1:
        shifted[19 + bob] = ".....KWWWWK...KWWWWK...."
        shifted[20 + bob] = ".....KBBBBK...KBBBBK...."
        shifted[21 + bob] = ".....KKKKKK...KKKKKK...."
    return _render_grid(shifted, size=(24, 24))


def draw_rasengan_orb() -> Image.Image:
    """8x8 Rasengan spiraling wind-chakra sphere."""
    orb_grid = [
        "..KKKK..",
        ".KEEEEk.",
        "KEWWWWWK",
        "KEWMWWEK",
        "KEWWWMwk",
        "KEWWWWWK",
        ".KEEEEK.",
        "..KKKK..",
    ]
    img = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    px = img.load()
    cmap = {
        '.': (0, 0, 0, 0),
        'K': (14, 116, 144, 255),
        'k': (56, 189, 248, 255),
        'E': (56, 189, 248, 255),
        'W': (224, 242, 254, 255),
        'w': (125, 211, 252, 255),
        'M': (255, 255, 255, 255),
    }
    for y, row in enumerate(orb_grid):
        for x, ch in enumerate(row):
            px[x, y] = cmap[ch]
    return img
