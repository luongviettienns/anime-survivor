import { describe, expect, it } from 'vitest';
import {
  applyContactDamage,
  applyEnemyKnockback,
  applyProjectileHit,
  clampHealth,
  createEnemyState,
  createPlayerState,
  isPlayerInvulnerable,
  unitDirection,
} from '../src/domain/combat';
import { awardXp, xpThreshold } from '../src/domain/progression';

describe('pure gameplay rules', () => {
  it('normalizes diagonal travel and provides aim fallback', () => {
    const vector = unitDirection({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(vector.x).toBeCloseTo(0.6);
    expect(vector.y).toBeCloseTo(0.8);
    expect(unitDirection({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 1, y: 0 });
  });

  it('clamps HP and rejects non-finite values', () => {
    expect(clampHealth(-10, 100)).toBe(0);
    expect(clampHealth(120, 100)).toBe(100);
    expect(() => clampHealth(Number.NaN, 100)).toThrow();
  });

  it('enforces player contact damage and 800ms i-frames starting at t=0', () => {
    const player = createPlayerState(100);
    expect(player.invulnerableUntilMs).toBe(Number.NEGATIVE_INFINITY);
    expect(isPlayerInvulnerable(player, 0)).toBe(false);

    // Hit at t=0 is accepted
    expect(applyContactDamage(player, 11, 0, 800)).toBe(true);
    expect(player.hp).toBe(89);
    expect(player.invulnerableUntilMs).toBe(800);
    expect(isPlayerInvulnerable(player, 0)).toBe(true);

    // Simultaneous overlaps at t=0 or during i-frame window (t=799) are rejected
    expect(applyContactDamage(player, 11, 0, 800)).toBe(false);
    expect(applyContactDamage(player, 11, 799, 800)).toBe(false);
    expect(player.hp).toBe(89);

    // Hit at exact boundary t=800 is accepted
    expect(isPlayerInvulnerable(player, 800)).toBe(false);
    expect(applyContactDamage(player, 11, 800, 800)).toBe(true);
    expect(player.hp).toBe(78);
    expect(player.invulnerableUntilMs).toBe(1600);
  });

  it('transitions player to dead once when HP reaches 0 and rejects further damage', () => {
    const player = createPlayerState(20);
    expect(applyContactDamage(player, 25, 100, 800)).toBe(true);
    expect(player.hp).toBe(0);
    expect(player.alive).toBe(false);
    expect(applyContactDamage(player, 10, 2000, 800)).toBe(false);
  });

  it('handles enemy projectile damage and idempotent single kill on duplicate hits', () => {
    const enemy = createEnemyState(1, 50, 94);
    const hit1 = applyProjectileHit(enemy, 28);
    expect(hit1).toEqual({ damaged: true, killed: false });
    expect(enemy.hp).toBe(22);
    expect(enemy.dead).toBe(false);

    const hit2 = applyProjectileHit(enemy, 28);
    expect(hit2).toEqual({ damaged: true, killed: true });
    expect(enemy.hp).toBe(0);
    expect(enemy.dead).toBe(true);

    // Second projectile in the same frame cannot kill again
    const duplicateHit = applyProjectileHit(enemy, 28);
    expect(duplicateHit).toEqual({ damaged: false, killed: false });
  });

  it('applies enemy knockback velocity away from source when alive', () => {
    const enemy = createEnemyState(2, 50, 94);
    applyEnemyKnockback(enemy, { x: 100, y: 100 }, { x: 130, y: 140 }, 250, 1000, 120);
    expect(enemy.knockbackVx).toBeCloseTo(150);
    expect(enemy.knockbackVy).toBeCloseTo(200);
    expect(enemy.knockbackUntilMs).toBe(1120);

    enemy.dead = true;
    applyEnemyKnockback(enemy, { x: 100, y: 100 }, { x: 100, y: 200 }, 300, 2000, 120);
    expect(enemy.knockbackUntilMs).toBe(1120);
  });

  it('clamps player damage with flat damageReduction to a minimum of 2', () => {
    const player = createPlayerState(100);
    expect(applyContactDamage(player, 10, 0, 800, 5)).toBe(true);
    expect(player.hp).toBe(95);
    expect(applyContactDamage(player, 10, 800, 800, 18)).toBe(true);
    expect(player.hp).toBe(93);
  });

  it('uses 3-stage XP threshold curve and levels up across multiple thresholds', () => {
    expect(xpThreshold(1)).toBe(9);
    expect(xpThreshold(5)).toBe(25);
    expect(xpThreshold(6)).toBe(51);
    expect(xpThreshold(15)).toBe(105);
    expect(xpThreshold(16)).toBe(190);
    expect(xpThreshold(20)).toBe(230);

    expect(awardXp({ level: 1, xp: 0 }, xpThreshold(1))).toEqual({
      level: 2,
      xp: 0,
      levelsGained: 1,
    });
    expect(awardXp({ level: 1, xp: 0 }, 22)).toEqual({
      level: 3,
      xp: 0,
      levelsGained: 2,
    });
    expect(() => awardXp({ level: 1, xp: 0 }, -1)).toThrow();
  });
});
