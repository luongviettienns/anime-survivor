import { expect, it } from 'vitest';
import { DUAL_ELEMENT_CLIPS, dualXVisual } from '../src/game/config/dualElementAssets';

it('registers all authored Dual X loop phases', () => {
  const clip = DUAL_ELEMENT_CLIPS.find(c => c.atlasKey === 'vfx_dual_element_x')!;
  expect(clip.loop).toBe(true);
  expect(clip.durationsMs).toEqual([90, 90]);
});

it('uses authored vertical views instead of turning the horizontal perspective upright', () => {
  const clip = DUAL_ELEMENT_CLIPS.find(c => c.animKey === 'vfx-dual-element-x-vertical')!;
  expect(clip.frameOffset).toBe(2);
  expect(clip.durationsMs).toEqual([90, 90]);
  expect(dualXVisual({ x: 0, y: -1 })).toEqual({ anim: clip.animKey, rotation: 0 });
  expect(dualXVisual({ x: 0, y: 1 })).toEqual({ anim: clip.animKey, rotation: Math.PI });
  expect(dualXVisual({ x: 1, y: 0 })).toEqual({ anim: 'vfx-dual-element-x', rotation: 0 });
  expect(dualXVisual({ x: -1, y: 0 })).toEqual({ anim: 'vfx-dual-element-x', rotation: Math.PI });
});
