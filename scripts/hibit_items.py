"""Deterministic Hi-bit item illustrations; supersampled thin outlines and highlights."""
import math
from PIL import Image, ImageDraw
from pack_frames import ROOT, CONTRACT
from ai_asset_import import source_path

SIZE = 256

def illustration(kind, phase=0):
    image = Image.new('RGBA', (SIZE, SIZE))
    d = ImageDraw.Draw(image)
    ink = '#192644'
    glow = '#72f8ed'
    if kind in ('gem', 'stat_magnet'):
        d.polygon([(128,30),(180,94),(152,207),(104,207),(76,94)], fill='#137eae', outline=ink, width=6)
        d.polygon([(128,42),(128,192),(86,96)], fill='#56e8e1')
        d.polygon([(128,42),(169,96),(128,113)], fill='#c2fff7')
        d.line([(86,96),(169,96),(128,192),(128,42)], fill=glow, width=3)
    elif kind in ('heal_pickup', 'stat_max_hp'):
        d.polygon([(128,213),(44,125),(40,82),(65,51),(99,51),(128,78),(157,51),(191,51),(216,82),(212,125)], fill='#b82f63', outline=ink, width=6)
        d.polygon([(128,190),(61,116),(58,86),(77,68),(98,68),(128,99)], fill='#ff7297')
        d.line([(72,87),(86,79),(101,87)], fill='#ffe4ed', width=7)
        d.line([(163,92),(163,144)], fill='#fff3dc', width=10)
        d.line([(141,118),(185,118)], fill='#fff3dc', width=10)
    elif kind == 'stat_move_speed':
        d.polygon([(70,43),(155,43),(148,135),(207,166),(204,200),(58,200),(49,176),(84,132)], fill='#385e95', outline=ink, width=6)
        d.polygon([(83,53),(139,53),(133,136),(102,147)], fill='#76d8e8')
        d.line([(67,182),(193,182)], fill='#e4fffd', width=6)
        for y in (80,109,138): d.line([(20,y),(61,y)],fill=glow,width=4)
    elif kind == 'stat_cooldown':
        d.ellipse((44,44,212,212),fill=ink,outline='#7ee4f5',width=7)
        d.ellipse((59,59,197,197),outline='#3e7195',width=3)
        d.line([(128,75),(128,130),(164,150)],fill='#e7ffff',width=7)
        d.rectangle((105,24,151,36),fill='#b6eaf9')
        for a in range(12):
            t=a*math.pi/6
            d.line([(128+65*math.sin(t),128+65*math.cos(t)),(128+72*math.sin(t),128+72*math.cos(t))],fill=glow,width=3)
    else:
        d.polygon([(150,28),(76,133),(117,137),(92,222),(187,106),(140,105)],fill='#eeac4e',outline=ink,width=6)
        d.polygon([(146,43),(96,122),(132,125),(111,181),(166,116),(129,117)],fill='#fff0b0')
        if kind == 'stat_crit':
            d.ellipse((45,45,210,210),outline='#ff7c9f',width=4)
            d.line([(28,128),(68,128)],fill='#ffd2dc',width=4)
            d.line([(188,128),(228,128)],fill='#ffd2dc',width=4)
    # Stable silhouette; only the small glint animates.
    x = 177 + phase*2
    d.line([(x,42),(x,66)],fill='#f1ffff',width=3)
    d.line([(x-12,54),(x+12,54)],fill='#f1ffff',width=3)
    return image.resize((64,64),Image.Resampling.LANCZOS)


def generate():
    out = ROOT / 'public/assets'
    weapons = {'weapon_orb': ('rasengan','spin'), 'weapon_slash': ('punch','hit'),
               'weapon_orbital': ('shuriken','spin'), 'weapon_mine': ('mine','pulse')}
    for icon in CONTRACT['icons']:
        if icon in weapons:
            with Image.open(source_path(*weapons[icon],0)) as source:
                image = source.convert('RGBA')
                image = image.crop(image.getchannel('A').getbbox())
                image.thumbnail((56,56),Image.Resampling.LANCZOS)
                canvas = Image.new('RGBA',(64,64))
                canvas.paste(image,((64-image.width)//2,(64-image.height)//2))
        else:
            canvas = illustration(icon)
        canvas.save(out / 'icons' / f'{icon}.png')
    for name in ('gem','heal_pickup'):
        for i in range(4):
            path = ROOT / 'art/frames' / name / CONTRACT['sprites'][name]['order'][0] / f'{i:03}.png'
            illustration(name,i).save(path)
    preview = Image.new('RGBA',(640,64),'#14253d')
    for i, icon in enumerate(CONTRACT['icons']):
        with Image.open(out / 'icons' / f'{icon}.png') as image: preview.paste(image,(i*64,0),image)
    preview.save(ROOT / 'art/icons_preview.png')

if __name__ == '__main__':
    generate()
