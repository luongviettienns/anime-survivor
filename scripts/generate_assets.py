"""Build assets from individual AI images and retained source frames; never draw art."""
from PIL import Image
from ai_asset_import import GROUPS, SOURCE, import_frame, source_path
from pack_frames import ROOT, CONTRACT, pack_all

FRAME_ROOT = ROOT / 'art/frames'
OUT = ROOT / 'public/assets'


def draw_sprite_frame(sprite, animation, frame):
    if sprite in GROUPS:
        return import_frame(sprite, animation, frame)
    path = FRAME_ROOT / sprite / animation / f'{frame:03}.png'
    with Image.open(path) as opened:
        return opened.convert('RGBA')


def single_images():
    import shutil
    for name in ('grass', 'hud_panel'):
        shutil.copy2(SOURCE / f'{name}.png', OUT / f'{name}.png')


def main():
    for sprite in GROUPS:
        spec = CONTRACT['sprites'][sprite]
        for animation in spec['order']:
            directory = FRAME_ROOT / sprite / animation
            directory.mkdir(parents=True, exist_ok=True)
            for index in range(spec['animations'][animation]):
                path = directory / f'{index:03}.png'
                pending = path.with_suffix('.pending.png')
                import_frame(sprite, animation, index).save(pending)
                pending.replace(path)
    from hibit_items import generate
    generate()
    single_images()
    from shadow_art import generate as generate_shadows
    generate_shadows()
    from ui_art import build as build_ui
    from damage_font import generate as generate_font
    build_ui()
    generate_font()
    from melee_art import build
    build()
    from skill_vfx_art import build as build_skill_vfx
    build_skill_vfx()
    pack_all(FRAME_ROOT, OUT)
    import json
    from export_original_art import export_originals
    export_originals()
    review = {name: {'usage': spec.get('usage', 'Applied in game'), 'display_width': spec.get('display_width', spec['frame_width']), 'display_height': spec.get('display_height', spec['frame_height']), 'original_pixels': name in GROUPS} for name, spec in CONTRACT['sprites'].items()}
    (OUT / 'art-review.json').write_text(json.dumps(review, indent=2)+'\n', encoding='utf-8')
    print(f'Imported AI images; packed {len(CONTRACT["sprites"])} validated-grid sheets. Retained other existing source art.')


if __name__ == '__main__':
    main()
