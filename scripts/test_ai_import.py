"""Imported frames preserve original RGBA pixels and source-file bytes."""
import hashlib
import json
import unittest
from PIL import Image
from ai_asset_import import GROUPS, SOURCE, ACTORS, import_frames, source_path, placement
from pack_frames import ROOT, CONTRACT

class AiImportTest(unittest.TestCase):
    def test_raw_source_hashes_have_not_changed(self):
        ledger = json.loads((SOURCE / 'provenance.json').read_text(encoding='utf-8'))
        for entry in ledger['sources']:
            self.assertEqual(hashlib.sha256((SOURCE / entry['file']).read_bytes()).hexdigest(), entry['sha256'])

    def test_all_frames_and_runtime_images_preserve_original_pixels(self):
        for sprite, animations in GROUPS.items():
            for animation, count in animations.items():
                frames = import_frames(sprite, animation)
                for index in range(count):
                    path = source_path(sprite, animation, index)
                    with Image.open(path) as opened:
                        source = opened.convert('RGBA')
                    x, y = placement(sprite, source)
                    self.assertEqual(frames[index].crop((x, y, x+source.width, y+source.height)).tobytes(), source.tobytes(), (sprite, animation, index))
                    runtime = ROOT / 'public/assets/runtime' / sprite / f'{animation}-{index:03}.png'
                    with Image.open(runtime) as result:
                        expected = source.resize((round(source.width/8), round(source.height/8)), Image.Resampling.LANCZOS)
                        self.assertEqual(result.tobytes(), expected.tobytes(), (sprite, animation, index))

    def test_actor_foot_anchors_survive_padding(self):
        for sprite in (*ACTORS, 'hero_actions'):
            expected = 1408 if sprite == 'hero_actions' else 1536
            for animation in GROUPS[sprite]:
                for frame in import_frames(sprite, animation):
                    box = frame.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
                    self.assertEqual(box[3], expected, (sprite, animation))

    def test_single_images_and_weapon_icons_are_original_files(self):
        for name in ('grass', 'hud_panel'):
            self.assertEqual((ROOT / 'public/assets' / f'{name}.png').read_bytes(), (SOURCE / f'{name}.png').read_bytes())
        for icon in CONTRACT['icons']:
            with Image.open(ROOT / 'public/assets/icons' / f'{icon}.png') as image:
                self.assertEqual(image.size, (64, 64))
                self.assertEqual(image.mode, 'RGBA')

    def test_directional_frames_fit_the_display_and_cast_hands_are_declared(self):
        for sprite in ACTORS:
            atlas = json.loads((ROOT / 'public/assets/runtime' / sprite / 'atlas.json').read_text())
            declared = {page['frames'][0]['animation'] for page in atlas['textures']}
            self.assertTrue({'walk', 'walk-side', 'walk-up'} <= declared)
            if sprite in ('enemy_mage', 'boss'):
                self.assertTrue({'cast', 'cast-side', 'cast-up'} <= declared)
            for page in atlas['textures']:
                frame = page['frames'][0]
                expected = 128 if sprite == 'boss' else 96 if sprite == 'enemy_elite' else 64
                self.assertAlmostEqual(frame['opaqueHeight'] * frame['displayScale'], expected)
                if frame['animation'].startswith('cast'):
                    self.assertEqual(len(frame['hands']), 2 if sprite == 'boss' else 1)
                    for x, y in frame['hands']:
                        self.assertTrue(0 < x < 2048 and 0 < y < 2048)

if __name__ == '__main__':
    unittest.main()
