"""Deterministic animated pixel-art generators for Weapons, Ancient Twilight Shrine Architecture, Organic Sakura Trees, and Calm Low-Contrast Ground."""
from __future__ import annotations
import math
from PIL import Image, ImageDraw


def draw_shuriken(frame: int) -> Image.Image:
    """24x24 4-frame top-down spinning Shadow Chakra Shuriken with silver blades & crackling violet motion arcs."""
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    px = img.load()
    cx, cy = 11.5, 11.5
    base_angle = (frame % 4) * (math.pi / 8.0)

    for deg in range(0, 360, 4):
        ang = math.radians(deg)
        rel = (ang - base_angle) % (math.pi / 2.0)
        if 0.35 < rel < 1.25:
            for r, col in [(9.4, (147, 51, 234, 210)), (8.5, (216, 180, 254, 185))]:
                if rel > 0.95 and r > 9.0:
                    continue
                x, y = int(round(cx + math.cos(ang) * r)), int(round(cy + math.sin(ang) * r))
                if 1 <= x <= 22 and 1 <= y <= 22:
                    px[x, y] = col

    for y in range(2, 22):
        for x in range(2, 22):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r > 9.6:
                continue
            ang = math.atan2(dy, dx) - base_angle
            sector = (ang + math.pi * 4) % (math.pi / 2.0)
            blade_width = max(0.0, 0.42 * (1.0 - r / 10.2))
            curve_center = 0.08 * (r / 9.0)
            dist = abs(sector - curve_center)
            if dist > math.pi / 4.0:
                dist = (math.pi / 2.0) - dist

            if r <= 2.1:
                px[x, y] = (20, 14, 34, 255) if r <= 1.2 else (245, 240, 255, 255)
            elif r <= 3.6:
                px[x, y] = (192, 132, 252, 255) if r <= 2.9 else (203, 213, 225, 255)
            elif dist <= blade_width:
                if dist > blade_width - 0.11 or r > 8.7:
                    px[x, y] = (24, 16, 42, 255)
                elif sector > curve_center:
                    px[x, y] = (255, 255, 255, 255) if r > 5.8 else (226, 232, 240, 255)
                else:
                    px[x, y] = (168, 85, 247, 255) if r > 6.2 else (100, 116, 139, 255)
    return img


MINE_PALETTE: dict[str, tuple[int, int, int, int]] = {
    '.': (0, 0, 0, 0), 'K': (20, 14, 18, 255), 'P': (245, 224, 179, 255),
    'D': (212, 180, 128, 255), 'R': (220, 38, 38, 255), 'B': (239, 68, 68, 255),
    'O': (249, 115, 22, 255), 'Y': (250, 204, 21, 255), 'W': (255, 255, 255, 255),
}


def draw_mine(frame: int) -> Image.Image:
    """16x16 4-frame pulsing Shinobi Explosive Paper Tag with animated seal glow & fuse sparks."""
    glow = frame % 2 == 1
    spark_pos = [(8, 1), (9, 1), (7, 1), (8, 2)][frame % 4]
    spark_outer = [(10, 2), (6, 2), (9, 2), (7, 2)][frame % 4]
    c = 'Y' if glow else 'R'
    core = 'W' if frame == 3 else ('O' if glow else 'B')
    grid = [
        "................", "................", "......KKKK......", ".....KPPPPK.....",
        "....KPRRRPPK....", "....KPRccPPK....", "....KPRCCPPK....", "....KPRCCPPK....",
        "....KPRccPPK....", "....KPRRRPDK....", "....KPPPPPDDK...", "....KPRRPPDDK...",
        "....KPDDPDDK....", ".....KKKKKK.....", "................", "................",
    ]
    rows = [list(r.replace('c', c).replace('C', core)) for r in grid]
    rows[spark_pos[1]][spark_pos[0]] = 'W' if glow else 'Y'
    rows[spark_outer[1]][spark_outer[0]] = 'O' if glow else 'Y'
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            px[x, y] = MINE_PALETTE[ch]
    return img


def _stamp_foliage_cluster(
    px: object, cx: int, cy: int, rx: int, ry: int,
    outline: tuple[int, int, int, int],
    dark: tuple[int, int, int, int],
    mid: tuple[int, int, int, int],
    light: tuple[int, int, int, int],
) -> None:
    """Stamp an organic pixel-art leaf cluster with top-left light and bottom-right shade."""
    for y in range(max(2, cy - ry - 1), min(46, cy + ry + 2)):
        for x in range(max(2, cx - rx - 1), min(38, cx + rx + 2)):
            nx = (x - cx) / max(1.0, float(rx))
            ny = (y - cy) / max(1.0, float(ry))
            # Scalloped pixel-cluster edge
            bump = 0.08 * math.sin(x * 1.7 + y * 1.1)
            d = nx * nx + ny * ny + bump
            if d > 1.05:
                continue
            if d > 0.78:
                px[x, y] = outline
            elif ny < -0.22 and nx < 0.35:
                px[x, y] = light
            elif ny < 0.28:
                px[x, y] = mid
            else:
                px[x, y] = dark


def draw_tree(frame: int) -> Image.Image:
    """40x48 4-frame organic Japanese Ancient Sakura-Bonsai Spirit Tree (multi-cluster canopy, gnarled trunk, falling petals)."""
    img = Image.new('RGBA', (40, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px = img.load()
    sway = [0, 1, 0, -1][frame % 4]

    # Soft ground shadow + gnarled twisting wood trunk & roots
    d.ellipse((6, 38, 34, 45), fill=(8, 14, 22, 160))
    # Root flare & trunk
    d.polygon([(13, 43), (17, 30), (23, 30), (27, 43), (22, 42), (20, 38), (18, 42)], fill='#1a1019')
    d.polygon([(15, 42), (18, 30), (22, 30), (25, 42), (21, 41), (20, 37), (18, 41)], fill='#452736')
    d.line([(18, 30), (16, 41)], fill='#6e4254', width=2)
    # Left & right branches reaching into canopy
    d.line([(18, 31), (12 + sway, 24)], fill='#38202c', width=3)
    d.line([(21, 31), (28 + sway, 23)], fill='#38202c', width=3)

    # Organic overlapping leaf & sakura clusters (deep twilight ink outline, plum-rose shadow, sakura pink, blossom cream)
    out_c = (22, 16, 32, 255)
    shd_c = (94, 43, 79, 255)
    mid_c = (168, 74, 122, 255)
    lit_c = (232, 132, 176, 255)
    hi_c = (252, 209, 230, 255)

    # Back/side clusters
    _stamp_foliage_cluster(px, 11 + sway, 22, 8, 6, out_c, shd_c, mid_c, lit_c)
    _stamp_foliage_cluster(px, 29 + sway, 21, 8, 6, out_c, shd_c, mid_c, lit_c)
    # Center & upper crown clusters
    _stamp_foliage_cluster(px, 20 + sway, 19, 10, 7, out_c, shd_c, mid_c, lit_c)
    _stamp_foliage_cluster(px, 15 + sway, 12, 8, 6, out_c, shd_c, mid_c, hi_c)
    _stamp_foliage_cluster(px, 25 + sway, 13, 8, 6, out_c, shd_c, mid_c, lit_c)
    _stamp_foliage_cluster(px, 20 + sway, 9, 7, 5, out_c, mid_c, lit_c, hi_c)

    # Gentle falling petal pixels drifting down around the trunk
    p1_y = 26 + ((frame * 3) % 12)
    p2_y = 24 + (((frame + 2) * 3) % 12)
    px[9 + sway, p1_y] = hi_c
    px[30 - sway, p2_y] = lit_c
    return img


def draw_torii_gate(frame: int) -> Image.Image:
    """48x48 4-frame Ancient Vermilion & Slate Shrine Torii Gate with swaying paper shide streamers."""
    img = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    sway = [0, 1, 0, -1][frame % 4]

    # Dual pillar ground shadows
    d.ellipse((6, 40, 18, 45), fill=(8, 14, 22, 165))
    d.ellipse((30, 40, 42, 45), fill=(8, 14, 22, 165))

    # Stone pillar bases (nemaki)
    for bx in (9, 33):
        d.rectangle((bx, 36, bx + 6, 43), fill='#171c28')
        d.rectangle((bx + 1, 36, bx + 5, 42), fill='#475569')
        d.rectangle((bx + 1, 36, bx + 3, 42), fill='#64748b')

    # Vermilion pillars (hashira)
    for px_x in (10, 34):
        d.rectangle((px_x, 11, px_x + 4, 36), fill='#1c1118')
        d.rectangle((px_x + 1, 11, px_x + 3, 36), fill='#991b1b')
        d.rectangle((px_x + 1, 11, px_x + 2, 36), fill='#dc2626')

    # Lower tie beam (nuki)
    d.rectangle((6, 17, 42, 21), fill='#1c1118')
    d.rectangle((7, 18, 41, 20), fill='#b91c1c')
    d.rectangle((7, 18, 41, 19), fill='#ef4444')

    # Center plaque (gakuzuka) with gold trim
    d.rectangle((21, 11, 27, 19), fill='#171c28')
    d.rectangle((22, 12, 26, 18), fill='#ca8a04')
    d.rectangle((23, 13, 25, 17), fill='#1e293b')
    d.point((24, 15), fill='#fde047')

    # Upper curved lintel roof (kasagi & shim木)
    d.polygon([(3, 7), (45, 7), (43, 12), (5, 12)], fill='#171c28')
    d.polygon([(4, 8), (44, 8), (42, 10), (6, 10)], fill='#334155')
    d.line([(5, 8), (43, 8)], fill='#64748b')
    d.rectangle((6, 11, 42, 13), fill='#dc2626')

    # Swaying white paper shide streamers hanging from rope
    for sx in (16, 24, 32):
        d.rectangle((sx + sway, 21, sx + 1 + sway, 24), fill='#f8fafc')
        d.rectangle((sx - 1 + sway, 24, sx + sway, 27), fill='#cbd5e1')
    return img


def draw_shrine_plaza(frame: int) -> Image.Image:
    """64x64 4-frame weathered slate shrine flagstone road/courtyard slab with subtle moss & faint spirit rune glint."""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Outer soft recessed stone border (inset 2px from 64x64 edges)
    d.rounded_rectangle((2, 2, 61, 61), radius=4, fill=(24, 34, 46, 235), outline=(15, 23, 32, 245))
    d.rounded_rectangle((4, 4, 59, 59), radius=3, fill=(31, 43, 57, 235), outline=(43, 58, 74, 220))

    # Flagstone grid joints (calm low-contrast slate slabs)
    for gy in (22, 42):
        d.line([(5, gy), (58, gy)], fill=(19, 28, 38, 220))
        d.line([(5, gy + 1), (58, gy + 1)], fill=(40, 54, 70, 180))
    for gx, y0, y1 in [(24, 5, 22), (42, 5, 22), (32, 23, 42), (20, 43, 58), (44, 43, 58)]:
        d.line([(gx, y0), (gx, y1)], fill=(19, 28, 38, 220))

    # Subtle carved inner spirit circle with gentle breathing teal-slate sheen
    pulse = [65, 95, 120, 95][frame % 4]
    d.ellipse((18, 18, 45, 45), outline=(56, 130, 146, pulse))
    d.ellipse((26, 26, 37, 37), outline=(74, 168, 180, pulse))

    # Soft muted moss along stone corners
    for mx, my in [(6, 6), (55, 7), (7, 54), (54, 53), (24, 22)]:
        d.rectangle((mx, my, mx + 2, my + 1), fill=(32, 64, 62, 210))
    return img


def draw_shrine_lantern(frame: int) -> Image.Image:
    """24x32 4-frame mossy Japanese stone shrine lantern (toro) with warm amber flame."""
    img = Image.new('RGBA', (24, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    flicker = frame % 2 == 1

    d.ellipse((4, 25, 20, 30), fill=(10, 18, 28, 155))
    d.ellipse((3, 7, 21, 23), fill=(251, 191, 36, 36 if flicker else 22))

    d.rectangle((7, 25, 17, 28), fill='#1e293b')
    d.rectangle((8, 25, 16, 27), fill='#475569')
    d.rectangle((9, 17, 15, 25), fill='#1e293b')
    d.rectangle((10, 17, 14, 24), fill='#64748b')

    d.rectangle((7, 10, 17, 17), fill='#1e293b')
    d.rectangle((8, 11, 16, 16), fill='#475569')
    d.rectangle((9, 11, 15, 16), fill='#78350f')
    flame_y = 12 if flicker else 13
    d.rectangle((10, flame_y, 14, 15), fill='#f97316')
    d.rectangle((11, flame_y, 13, 14), fill='#fde047')
    d.point((12, flame_y), fill='#ffffff')

    d.polygon([(12, 3), (20, 9), (19, 11), (5, 11), (4, 9)], fill='#1e293b')
    d.polygon([(12, 4), (19, 9), (5, 9)], fill='#64748b')
    d.polygon([(12, 4), (15, 8), (7, 8)], fill='#94a3b8')
    d.rectangle((11, 2, 13, 4), fill='#cbd5e1')
    d.rectangle((7, 8, 10, 9), fill='#2d6a4f')
    return img


def draw_spirit_flower(frame: int) -> Image.Image:
    """16x16 4-frame calm swaying forest bush & soft sakura-bloom tuft."""
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    sway = [0, 1, 0, -1][frame % 4]

    d.ellipse((2, 10, 14, 14), fill=(10, 18, 26, 145))
    d.ellipse((2 + sway, 5, 13 + sway, 13), fill='#122430')
    d.ellipse((3 + sway, 6, 12 + sway, 12), fill='#1f424a')
    d.ellipse((4 + sway, 6, 10 + sway, 10), fill='#2c5e63')
    d.rectangle((5 + sway, 7, 6 + sway, 8), fill='#e884b0')
    d.point((10 + sway, 8), fill='#f4b8d4')
    return img


def draw_grass_tile() -> Image.Image:
    """128x128 ultra-calm, low-contrast velvety twilight shrine ground (zero camo blobs, zero eye strain)."""
    w, h = 128, 128
    # Calm deep slate-jade base (#16242e) with micro luminance delta (< 4%) so scrolling is 100% soothing
    img = Image.new('RGBA', (w, h), (22, 36, 46, 255))
    px = img.load()

    for y in range(h):
        for x in range(w):
            # Soft subtle weave that stays within 3 RGB steps of the base color
            hval = ((x * 37 + y * 53) ^ (x * 13)) & 31
            if hval == 0:
                px[x, y] = (20, 33, 43, 255)
            elif hval == 1:
                px[x, y] = (24, 39, 49, 255)

    # Sparse, low-contrast muted grass blades (only +8 RGB brighter than base — never strobes!)
    tufts = [
        (18, 22), (64, 16), (108, 30), (36, 62), (88, 54),
        (24, 102), (74, 96), (114, 88), (52, 118),
    ]
    for tx, ty in tufts:
        c1 = (28, 46, 56, 255)
        c2 = (33, 53, 64, 255)
        px[tx % w, ty % h] = c1
        px[(tx + 1) % w, (ty - 1) % h] = c2
        px[(tx - 1) % w, (ty - 1) % h] = c1
    return img
