import { describe, expect, it } from 'vitest';
import {
  canWeaponFire,
  commitWeaponFire,
  createWeaponCooldown,
  selectNearestTarget,
  type TargetCandidate,
} from '../src/domain/targeting';

function makeCandidate(overrides: Partial<TargetCandidate> & { id: number }): TargetCandidate {
  return {
    id: overrides.id,
    x: overrides.x ?? 100,
    y: overrides.y ?? 0,
    active: overrides.active ?? true,
    bodyEnabled: overrides.bodyEnabled ?? true,
    hp: overrides.hp ?? 50,
    dead: overrides.dead ?? false,
  };
}

describe('targeting and weapon cooldown domain rules', () => {
  it('selects nearest active, alive target within range', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 1, x: 300, y: 0 }),
      makeCandidate({ id: 2, x: 120, y: 0 }),
      makeCandidate({ id: 3, x: 50, y: 0, active: false }),
      makeCandidate({ id: 4, x: 40, y: 0, bodyEnabled: false }),
      makeCandidate({ id: 5, x: 30, y: 0, hp: 0 }),
      makeCandidate({ id: 6, x: 20, y: 0, dead: true }),
    ];
    const selected = selectNearestTarget(origin, candidates, 520);
    expect(selected?.id).toBe(2);
  });

  it('ignores targets outside attack range and returns null when none eligible', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 1, x: 521, y: 0 }),
      makeCandidate({ id: 2, x: 0, y: 600 }),
    ];
    expect(selectNearestTarget(origin, candidates, 520)).toBeNull();
    expect(selectNearestTarget(origin, [makeCandidate({ id: 3, x: 520, y: 0 })], 520)?.id).toBe(3);
  });

  it('breaks ties deterministically by smaller stable spawn ID', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 9, x: 100, y: 0 }),
      makeCandidate({ id: 4, x: 0, y: -100 }),
      makeCandidate({ id: 7, x: -100, y: 0 }),
    ];
    expect(selectNearestTarget(origin, candidates, 520)?.id).toBe(4);
  });

  it('allows first shot at t=0, blocks during cooldown, and does not spend cooldown without fire commit', () => {
    const cooldown = createWeaponCooldown(380);
    expect(canWeaponFire(cooldown, 0)).toBe(true);

    // No target at t=0 -> we do not call commitWeaponFire, so t=50 is still ready
    expect(canWeaponFire(cooldown, 50)).toBe(true);

    // Target found at t=50 -> commit fire
    commitWeaponFire(cooldown, 50);
    expect(cooldown.nextAttackAtMs).toBe(430);
    expect(canWeaponFire(cooldown, 429)).toBe(false);
    expect(canWeaponFire(cooldown, 430)).toBe(true);
  });
});
