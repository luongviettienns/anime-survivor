import { describe, expect, it } from 'vitest';
import { unitDirection, clampHealth } from '../src/domain/combat';
import { awardXp, xpThreshold } from '../src/domain/progression';

describe('pure gameplay rules', () => {
  it('normalizes diagonal travel', () => {
    const vector = unitDirection({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(vector.x).toBeCloseTo(0.6);
    expect(vector.y).toBeCloseTo(0.8);
  });
  it('handles zero-length direction', () => {
    expect(unitDirection({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 1, y: 0 });
  });
  it('clamps HP', () => {
    expect(clampHealth(-10, 100)).toBe(0);
    expect(clampHealth(120, 100)).toBe(100);
  });
  it('levels up across multiple thresholds', () => {
    expect(awardXp({ level: 1, xp: 0 }, xpThreshold(1))).toEqual({ level: 2, xp: 0, levelsGained: 1 });
    expect(awardXp({ level: 1, xp: 0 }, 12)).toEqual({ level: 3, xp: 0, levelsGained: 2 });
  });
  it('rejects negative experience', () => {
    expect(() => awardXp({ level: 1, xp: 0 }, -1)).toThrow();
  });
});
