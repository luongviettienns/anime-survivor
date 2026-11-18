"""Original weapon pixels survive padding without resampling."""
import unittest
from PIL import Image
from ai_asset_import import import_frame, source_path, placement

class WeaponArtTest(unittest.TestCase):
    def test_weapon_rgba_pixels_are_original(self):
        for sprite, animation in [('orb', 'spin'), ('shuriken', 'spin'), ('kunai', 'cut'), ('mine', 'pulse')]:
            for index in range(2):
                with Image.open(source_path(sprite, animation, index)) as opened:
                    source = opened.convert('RGBA')
                frame = import_frame(sprite, animation, index)
                x, y = placement(sprite, source)
                self.assertEqual(frame.crop((x, y, x+source.width, y+source.height)).tobytes(), source.tobytes())

if __name__ == '__main__':
    unittest.main()
