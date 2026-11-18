"""Original slanted arcade digit bitmap font; no installed font or external license dependency."""
from PIL import Image, ImageDraw
from xml.etree.ElementTree import Element, SubElement, ElementTree
from pack_frames import ROOT

GLYPHS = {
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '1':['00110','01110','00110','00110','00110','00110','01111'],
 '2':['01110','11011','00011','00110','01100','11000','11111'],
 '3':['11110','00011','00011','01110','00011','00011','11110'],
 '4':['11011','11011','11011','11111','00011','00011','00011'],
 '5':['11111','11000','11000','11110','00011','11011','01110'],
 '6':['01110','11000','11000','11110','11011','11011','01110'],
 '7':['11111','00011','00110','00110','01100','01100','01100'],
 '8':['01110','11011','11011','01110','11011','11011','01110'],
 '9':['01110','11011','11011','01111','00011','00011','01110'],
 '!':['00110','00110','00110','00110','00110','00000','00110'],
 '-':['00000','00000','00000','11111','00000','00000','00000']}


def generate():
    sheet = Image.new('RGBA',(256,256))
    root = Element('font');SubElement(root,'info',face='AnimeCombatOriginal',size='40')
    SubElement(root,'common',lineHeight='48',base='40',scaleW='256',scaleH='256',pages='1',packed='0')
    pages=SubElement(root,'pages');SubElement(pages,'page',id='0',file='font_damage_anime.png')
    chars=SubElement(root,'chars',count=str(len(GLYPHS)))
    for index,(char,pattern) in enumerate(GLYPHS.items()):
        x,y=(index%4)*64,(index//4)*64
        mask=Image.new('L',(64,64));d=ImageDraw.Draw(mask)
        for row,line in enumerate(pattern):
            for col,bit in enumerate(line):
                if bit=='1':
                    left=12+col*6+(6-row)*2;top=8+row*6
                    d.rectangle((left,top,left+5,top+5),fill=255)
        from PIL import ImageFilter
        outline=mask.filter(ImageFilter.MaxFilter(7))
        tile=Image.new('RGBA',(64,64));tile.paste('#b8322e',(3,4,67,68),outline)
        tile.paste('#100b23',(0,0,64,64),outline)
        fill=Image.new('RGBA',(64,64));fd=ImageDraw.Draw(fill)
        for yy in range(64): fd.line((0,yy,63,yy),fill=(255,255-max(0,yy-18)*3,max(65,240-yy*4),255))
        tile.paste(fill,(0,0),mask);sheet.paste(tile,(x,y))
        SubElement(chars,'char',id=str(ord(char)),x=str(x),y=str(y),width='64',height='56',xoffset='-6',yoffset='0',xadvance='44',page='0',chnl='15')
    out=ROOT/'public/assets'
    mark=Image.new('RGBA',(96,96));md=ImageDraw.Draw(mark)
    points=[(48,7),(57,31),(83,18),(68,42),(91,55),(65,61),(75,85),(52,70),(33,89),(31,65),(7,75),(23,51),(6,33),(33,32)]
    md.polygon(points,fill=(157,41,22,100),outline=(255,144,61,180),width=2)
    mark.save(out/'damage_explosion_mark.png')
    sheet.save(out/'font_damage_anime.png');ElementTree(root).write(out/'font_damage_anime.xml',encoding='utf-8',xml_declaration=True)

if __name__=='__main__': generate()
