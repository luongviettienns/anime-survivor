import { describe, expect, it } from 'vitest';
import { ACTOR_CLIPS } from '../src/game/config/actorClips';
import { getDualSlashStage } from '../src/domain/weapons';

describe('directional actor animation assets', () => {
  it('matches authored cut frames to the existing gameplay release times', () => {
    for (const direction of ['down', 'up', 'left', 'right']) for (const [action, level, poses] of [
      ['lv1', 1, ['ice_cut']], ['lv2', 3, ['ice_cut', 'dark_cut']], ['lv3', 5, ['dual_cross']],
    ] as const) {
      const clip = ACTOR_CLIPS[`kirito_${action}_${direction}`]!;
      const releases = poses.map(pose => {
        const index = clip.frames.findIndex(frame => frame.image.endsWith(`/${pose}.png`));
        expect(index).toBeGreaterThan(0);
        return clip.durations.slice(0, index).reduce((sum, duration) => sum + duration, 0);
      });
      expect(releases).toEqual(getDualSlashStage(level).waves.map(wave => wave.releaseDelayMs));
    }
  });
  it('covers the compact remaining directions and front boss defeat', () => {
    for (const direction of ['left', 'right']) for (const action of ['run', 'hit', 'death', 'basic', 'lv1', 'lv2', 'lv3']) {
      const clip = ACTOR_CLIPS[`kirito_${action}_${direction}`];
      expect(clip, `${action}/${direction}`).toBeDefined();
      expect(clip!.direction).toBe(direction);
    }
    expect(ACTOR_CLIPS.boss_death_down).toBeDefined();
    expect(ACTOR_CLIPS.boss_death_up).toBeUndefined();
  });
  it('keeps every source anchor inside its native canvas and excludes the clipped run draft', () => {
    for (const clip of Object.values(ACTOR_CLIPS)) {
      expect(clip.durations.length).toBe(clip.frames.length);
      expect(clip.scale).toBeGreaterThan(0);
      expect(clip.durations.every(duration => duration > 0)).toBe(true);
      for (const frame of clip.frames) expect(frame.origin.every(value => value > 0 && value < 1)).toBe(true);
    }
    expect(ACTOR_CLIPS.kirito_run_up!.frames.some(frame => frame.image.endsWith('/run_contact_l.png'))).toBe(false);
  });
});
