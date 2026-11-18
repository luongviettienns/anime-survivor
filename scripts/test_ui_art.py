"""Validate UI content frames, original source hashes and bitmap font metrics."""
import hashlib
import json
import unittest
from xml.etree import ElementTree as ET
from PIL import Image
from pack_frames import ROOT
from ui_art import KEYS

class UiArtTest(unittest.TestCase):
    def test_original_ui_sources_preserved(self):
        folder=ROOT/'art/source/arcane-ui'
        ledger=json.loads((folder/'provenance.json').read_text())
        self.assertEqual(len(ledger['sources']),8)
        for entry in ledger['sources']:
            self.assertEqual(hashlib.sha256((folder/entry['file']).read_bytes()).hexdigest(),entry['sha256'])

    def test_runtime_content_frames_are_bounded_and_nonempty(self):
        out=ROOT/'public/assets'
        metadata=json.loads((out/'ui-layout.json').read_text())
        self.assertEqual(set(metadata),set(KEYS))
        for key,box in metadata.items():
            with Image.open(out/f'{key}.png') as image:
                self.assertEqual(image.size,(256,256));self.assertEqual(image.mode,'RGBA')
                x,y,w,h=box['x'],box['y'],box['w'],box['h']
                self.assertTrue(0<=x<x+w<=256 and 0<=y<y+h<=256)
                self.assertIsNotNone(image.crop((x,y,x+w,y+h)).getchannel('A').getbbox())

    def test_font_has_all_digits_and_exact_nonoverlapping_glyph_rectangles(self):
        out=ROOT/'public/assets'
        font=ET.parse(out/'font_damage_anime.xml').getroot()
        chars=font.findall('chars/char')
        self.assertEqual({chr(int(char.attrib['id'])) for char in chars},set('0123456789!-'))
        with Image.open(out/'font_damage_anime.png') as image:
            self.assertEqual(image.size,(256,256))
            rectangles=[];hashes=set()
            for char in chars:
                x,y,w,h=[int(char.attrib[key]) for key in ('x','y','width','height')]
                self.assertTrue(0<=x<x+w<=256 and 0<=y<y+h<=256)
                for px,py,pw,ph in rectangles:
                    self.assertTrue(x+w<=px or px+pw<=x or y+h<=py or py+ph<=y)
                rectangles.append((x,y,w,h));cut=image.crop((x,y,x+w,y+h))
                self.assertIsNotNone(cut.getchannel('A').getbbox());hashes.add(hashlib.sha256(cut.tobytes()).hexdigest())
            self.assertEqual(len(hashes),12)

if __name__=='__main__':unittest.main()
