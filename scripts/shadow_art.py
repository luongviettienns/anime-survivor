"""Original deterministic soft ground/contact shadow PNGs, no external artwork."""
import math
from PIL import Image
from pack_frames import ROOT


def generate():
    for name, width, height, strength in [('shadow_actor',128,64,1),('shadow_pickup',64,32,0.65)]:
        image = Image.new('RGBA',(width,height))
        pixels = []
        for y in range(height):
            for x in range(width):
                radius = math.hypot((x-width/2)/(width/2-2),(y-height/2)/(height/2-2))
                alpha = round(strength*(65*max(0,1-radius)**2 + (75*math.exp(-radius*radius*15) if radius<1 else 0)))
                pixels.append((8,7,19,alpha))
        image.putdata(pixels)
        assert image.getchannel('A').getpixel((0,0)) == 0
        box = image.getchannel('A').getbbox()
        assert 0 < box[0] < box[2] < width and 0 < box[1] < box[3] < height
        image.save(ROOT/'public/assets'/f'{name}.png')

if __name__ == '__main__':
    generate()
