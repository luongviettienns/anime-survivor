import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { PHANTOM_DASH } from '../src/domain/phantomDash';
import { registerDashAnimations } from '../src/game/config/phantomDashAssets';

it('stretches each authored Dash direction to the slowed gameplay duration', () => {
  const definitions: Array<{ frames: Array<{ duration: number }> }> = [];
  const scene = { anims: { create: (config: { frames: Array<{ duration: number }> }) => definitions.push(config) } };
  registerDashAnimations(scene as unknown as Phaser.Scene);
  expect(definitions).toHaveLength(4);
  for (const clip of definitions) expect(clip.frames.reduce((sum, frame) => sum + frame.duration, 0)).toBeCloseTo(PHANTOM_DASH.durationMs);
});
