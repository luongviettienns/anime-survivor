"""Regression checks for the imported hero's pixel-art contract."""
import unittest
from naruto_ai_art import COLORS, draw_hero
from pack_frames import CONTRACT


class HeroArtTest(unittest.TestCase):
    def test_frames_have_binary_alpha_shared_palette_and_fixed_baseline(self):
        colors = set()
        for animation, count in CONTRACT['sprites']['hero']['animations'].items():
            frames = [draw_hero(animation, i) for i in range(count)]
            if count > 1:
                self.assertGreater(len({f.tobytes() for f in frames}), 1)
            for frame in frames:
                self.assertEqual((frame.mode, frame.size), ('RGBA', (32, 32)))
                self.assertEqual(set(frame.getchannel('A').getdata()), {0, 255})
                box = frame.getchannel('A').getbbox()
                self.assertIsNotNone(box)
                self.assertGreater(box[0], 0)
                self.assertGreater(box[1], 0)
                self.assertLess(box[2], 32)
                self.assertEqual(box[3], 30)
                colors.update(frame.getdata())
        self.assertLessEqual(len(colors), len(COLORS) + 1)

    def test_running_head_and_torso_do_not_jitter(self):
        reference = draw_hero('walk', 0).crop((0, 0, 32, 21)).tobytes()
        for index in range(1, 4):
            self.assertEqual(draw_hero('walk', index).crop((0, 0, 32, 21)).tobytes(), reference)

    def test_rejects_invalid_animation_or_frame(self):
        for animation, index in [('attack', 0), ('idle', -1), ('walk', 4), ('walk-up', 2)]:
            with self.assertRaises(ValueError):
                draw_hero(animation, index)


if __name__ == '__main__':
    unittest.main()
