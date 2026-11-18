import { expect, it } from 'vitest';
import { DUAL_ELEMENT_CLIPS } from '../src/game/config/dualElementAssets';

it('registers all authored Dual X loop phases', () => {
  const clip = DUAL_ELEMENT_CLIPS.find(c => c.atlasKey === 'vfx_dual_element_x')!;
  expect(clip.loop).toBe(true);
  expect(clip.durationsMs).toEqual([60,60,60]);
});
