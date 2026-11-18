"""Export reviewed UI images as256px textures with exact nontransparent content frames."""
import json
from PIL import Image
from pack_frames import ROOT

KEYS = ('ui_card_base','ui_emblem_socket','ui_banner_levelup','hud_pip_glow','icon_boss_crown')


def build():
    bounds = {}
    review = Image.new('RGBA',(256*4,256*2),'#152238')
    for index,key in enumerate(KEYS):
        with Image.open(ROOT/'art/source/arcane-ui'/f'{key}.png') as opened:
            if opened.mode != 'RGBA': raise ValueError(f'{key}: needs RGBA')
            image = opened.copy()
        box = image.getchannel('A').getbbox()
        if not box or image.getchannel('A').getextrema()[0] == 255: raise ValueError(f'{key}: needs transparent art')
        image = image.crop(box)
        image.thumbnail((248,248),Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA',(256,256))
        x,y = (256-image.width)//2,(256-image.height)//2
        canvas.paste(image,(x,y));canvas.save(ROOT/'public/assets'/f'{key}.png')
        visible = canvas.getchannel('A').point(lambda value: 255 if value >= 8 else 0).getbbox()
        left,top,right,bottom = visible
        left,top,right,bottom = max(0,left-2),max(0,top-2),min(256,right+2),min(256,bottom+2)
        bounds[key] = {'x':left,'y':top,'w':right-left,'h':bottom-top}
        review.paste(canvas,((index%4)*256,(index//4)*256),canvas)
    (ROOT/'public/assets/ui-layout.json').write_text(json.dumps(bounds,indent=2)+'\n')
    review.save(ROOT/'art/review/arcane-ui.png')

if __name__ == '__main__': build()
