"""Regression checks for generated melee art and retained source provenance."""
import hashlib
import json
import unittest
from PIL import Image
from pack_frames import ROOT


class MeleeArtTest(unittest.TestCase):
    def test_original_keyposes_remain_unchanged(self):
        for directory, count in [('melee-attacks', 12), ('skill-vfx', 8)]:
            root = ROOT / 'art/source' / directory
            ledger = json.loads((root / 'provenance.json').read_text())
            self.assertEqual(len(ledger['sources']), count)
            for entry in ledger['sources']:
                self.assertEqual(hashlib.sha256((root / entry['file']).read_bytes()).hexdigest(), entry['sha256'])

    def test_directional_cycles_have_stable_feet_and_distinct_attack_poses(self):
        for sprite in ('enemy_attack', 'enemy_shade_attack'):
            for direction in ('down', 'side', 'up'):
                frames = []
                for index in range(4):
                    with Image.open(ROOT/'art/frames'/sprite/f'attack-{direction}'/f'{index:03}.png') as frame:
                        self.assertEqual(frame.mode, 'RGBA')
                        self.assertEqual(frame.size, (256,256))
                        box = frame.getchannel('A').point(lambda value: 255 if value >= 128 else 0).getbbox()
                        self.assertLessEqual(abs(box[3] - 192), 2)
                        self.assertTrue(0 < box[0] < box[2] < 256)
                        frames.append(frame.tobytes())
                self.assertEqual(frames[0], frames[3])
                self.assertNotEqual(frames[1], frames[0])
                self.assertNotEqual(frames[2], frames[1])

if __name__ == '__main__':
    unittest.main()
