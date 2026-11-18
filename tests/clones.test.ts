import { describe, expect, it } from 'vitest';
import {
  CLONE_SPAWN_RADIUS_PX,
  CLONE_STAGGER_MS,
  CLONE_SWEEP_ARC_COS_MIN,
  getCloneLevelSpec,
  isInsideSweepCone,
  planCloneFormation,
} from '../src/domain/clones';

describe('Kage Bunshin clone domain', () => {
  it('returns exact clone level specs for levels 1..5 and rejects out-of-range levels', () => {
    expect(CLONE_SPAWN_RADIUS_PX).toBe(58);
    expect(CLONE_STAGGER_MS).toBe(40);
    expect(CLONE_SWEEP_ARC_COS_MIN).toBe(0.5);

    expect(getCloneLevelSpec(1)).toEqual({
      level: 1, count: 1, damage: 35, cooldownMs: 2200, triggerRangePx: 140, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2,
    });
    expect(getCloneLevelSpec(2)).toEqual({
      level: 2, count: 2, damage: 40, cooldownMs: 2000, triggerRangePx: 160, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2,
    });
    expect(getCloneLevelSpec(3)).toEqual({
      level: 3, count: 3, damage: 45, cooldownMs: 1800, triggerRangePx: 160, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2,
    });
    expect(getCloneLevelSpec(4)).toEqual({
      level: 4, count: 4, damage: 50, cooldownMs: 1600, triggerRangePx: 180, hitRadiusPx: 52, knockbackPxSec: 180, maxHitsPerClone: 2,
    });
    expect(getCloneLevelSpec(5)).toEqual({
      level: 5, count: 4, damage: 60, cooldownMs: 1400, triggerRangePx: 180, hitRadiusPx: 60, knockbackPxSec: 200, maxHitsPerClone: 2,
    });

    expect(() => getCloneLevelSpec(0)).toThrow();
    expect(() => getCloneLevelSpec(6)).toThrow();
  });

  it('plans symmetric clone formations at 58px radius around target with staggered delays', () => {
    const player = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };

    const lv1 = planCloneFormation(player, target, 1);
    expect(lv1).toHaveLength(1);
    expect(lv1[0]!.spawn.x).toBeCloseTo(42, 5);
    expect(lv1[0]!.spawn.y).toBeCloseTo(0, 5);
    expect(lv1[0]!.dir.x).toBeCloseTo(1, 5);
    expect(lv1[0]!.dir.y).toBeCloseTo(0, 5);
    expect(lv1[0]!.launchDelayMs).toBe(0);

    const lv2 = planCloneFormation(player, target, 2);
    expect(lv2).toHaveLength(2);
    expect(lv2[0]!.spawn.x).toBeCloseTo(42, 5);
    expect(lv2[0]!.spawn.y).toBeCloseTo(0, 5);
    expect(lv2[1]!.spawn.x).toBeCloseTo(158, 5);
    expect(lv2[1]!.spawn.y).toBeCloseTo(0, 5);
    expect(lv2.map((p) => p.launchDelayMs)).toEqual([0, 40]);

    const lv3 = planCloneFormation(player, target, 3);
    expect(lv3).toHaveLength(3);
    expect(lv3.map((p) => p.launchDelayMs)).toEqual([0, 40, 80]);
    for (const plan of lv3) {
      expect(Math.hypot(plan.spawn.x - target.x, plan.spawn.y - target.y)).toBeCloseTo(58, 5);
    }
    const dot3 = (lv3[0]!.spawn.x - target.x) * (lv3[1]!.spawn.x - target.x) + (lv3[0]!.spawn.y - target.y) * (lv3[1]!.spawn.y - target.y);
    expect(dot3 / (58 * 58)).toBeCloseTo(-0.5, 5);

    for (const level of [4, 5]) {
      const lv4 = planCloneFormation(player, target, level);
      expect(lv4).toHaveLength(4);
      expect(lv4.map((p) => p.launchDelayMs)).toEqual([0, 40, 80, 120]);
      for (const plan of lv4) {
        expect(Math.hypot(plan.spawn.x - target.x, plan.spawn.y - target.y)).toBeCloseTo(58, 5);
      }
      const dot4 = (lv4[0]!.spawn.x - target.x) * (lv4[1]!.spawn.x - target.x) + (lv4[0]!.spawn.y - target.y) * (lv4[1]!.spawn.y - target.y);
      expect(dot4 / (58 * 58)).toBeCloseTo(0, 5);
    }
  });

  it('checks 120-degree forward sweep cone, point-blank hit, and rejections', () => {
    const clonePos = { x: 100, y: 100 };
    const dir = { x: 1, y: 0 };

    // Inside 120-deg forward cone (cos >= 0.5) within hitRadiusPx (48)
    expect(isInsideSweepCone(clonePos, dir, { x: 140, y: 100 }, 48)).toBe(true);
    expect(isInsideSweepCone(clonePos, dir, { x: 120, y: 130 }, 48)).toBe(true); // cos = 20/36.05 = 0.554 >= 0.5

    // Point-blank (dist <= 16) even behind clone
    expect(isInsideSweepCone(clonePos, dir, { x: 84, y: 100 }, 48)).toBe(true);
    expect(isInsideSweepCone(clonePos, dir, { x: 92, y: 92 }, 48)).toBe(true);

    // Behind clone outside point-blank (dist > 16, dot < 0.5)
    expect(isInsideSweepCone(clonePos, dir, { x: 80, y: 100 }, 48)).toBe(false);
    expect(isInsideSweepCone(clonePos, dir, { x: 105, y: 130 }, 48)).toBe(false); // cos = 5/30.41 = 0.164 < 0.5

    // Outside hitRadiusPx even straight ahead
    expect(isInsideSweepCone(clonePos, dir, { x: 149, y: 100 }, 48)).toBe(false);
  });
});
