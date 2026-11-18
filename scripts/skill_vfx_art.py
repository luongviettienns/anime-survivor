"""Export single ImageGen VFX frames onto a fixed runtime canvas; keep originals."""
import json
from PIL import Image
from pack_frames import ROOT, pack_sprite

KEYS = ('slam_wave', 'shade_claw')
SOURCE = ROOT / 'art/source/skill-vfx'


def build():
    out = ROOT / 'public/assets'
    manifest = json.loads((out / 'sprites.manifest.json').read_text())
    review = Image.new('RGBA', (384*4,384*2), '#172333')
    for row, key in enumerate(KEYS):
        for index in range(4):
            source = SOURCE / key / f'{index:03}.png'
            with Image.open(source) as opened:
                if opened.mode != 'RGBA':
                    raise ValueError(f'{source}: requires RGBA')
                image = opened.copy()
            if not image.getchannel('A').getbbox() or image.getchannel('A').getextrema()[0] == 255:
                raise ValueError(f'{source}: requires transparent, nonempty effect')
            image = image.crop(image.getchannel('A').getbbox())
            extent = ((220,320,352,352) if key == 'slam_wave' else (176,320,352,352))[index]
            image.thumbnail((extent,extent), Image.Resampling.LANCZOS)
            canvas = Image.new('RGBA',(384,384))
            canvas.paste(image,((384-image.width)//2,(384-image.height)//2))
            folder = ROOT / 'art/frames' / key / 'burst'
            folder.mkdir(parents=True,exist_ok=True)
            canvas.save(folder / f'{index:03}.png')
            review.paste(canvas,(index*384,row*384),canvas)
        manifest['sprites'][key] = pack_sprite(key,ROOT/'art/frames',out)
    (out/'sprites.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'art/review').mkdir(exist_ok=True)
    review.save(ROOT/'art/review/skill-vfx.png')

if __name__ == '__main__':
    build()
