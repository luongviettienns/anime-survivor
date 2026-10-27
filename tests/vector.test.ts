import { describe, expect, it } from 'vitest';
import {
  aimDirection,
  chaseVelocity,
  directionFromTo,
  movementVelocity,
  normalized,
} from '../src/domain/vector';
import { ENEMY, PICKUP, PLAYER, PROJECTILE, WORLD } from '../src/game/config/constants';

describe('vector and movement domain rules', () => {
  it('exposes contract default constants', () => {
    expect(WORLD.width).toBe(1800);
    expect(WORLD.height).toBe(1200);
    expect(PLAYER.speed).toBe(250);
    expect(PLAYER.maxHealth).toBe(100);
    expect(PLAYER.invulnerabilityMs).toBe(800);
    expect(PLAYER.attackIntervalMs).toBe(380);
    expect(ENEMY.baseHealth).toBe(50);
    expect(ENEMY.baseSpeed).toBe(94);
    expect(ENEMY.touchDamage).toBe(11);
    expect(ENEMY.maxAlive).toBe(130);
    expect(PROJECTILE.speed).toBe(560);
    expect(PROJECTILE.damage).toBe(28);
    expect(PROJECTILE.lifeMs).toBe(1400);
    expect(PROJECTILE.range).toBe(520);
    expect(PICKUP.xpPerKill).toBe(1);
    expect(PICKUP.healAmount).toBe(25);
  });

  it('normalizes vectors and returns (0,0) for zero/coincident vectors', () => {
    expect(normalized({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(normalized({ x: 1e-9, y: -1e-9 })).toEqual({ x: 0, y: 0 });
    expect(directionFromTo({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
    const unit = directionFromTo({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(unit.x).toBeCloseTo(0.6, 5);
    expect(unit.y).toBeCloseTo(0.8, 5);
  });

  it('provides deterministic aim fallback when positions coincide', () => {
    expect(aimDirection({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 1, y: 0 });
    expect(aimDirection({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
    const aimed = aimDirection({ x: 0, y: 0 }, { x: 0, y: 10 });
    expect(aimed.x).toBeCloseTo(0, 5);
    expect(aimed.y).toBeCloseTo(1, 5);
  });

  it('computes 8-direction movementVelocity with invariant speed 250', () => {
    const speed = 250;
    expect(movementVelocity({ x: 0, y: 0 }, speed)).toEqual({ x: 0, y: 0 });
    expect(movementVelocity({ x: 1, y: 0 }, speed)).toEqual({ x: 250, y: 0 });
    expect(movementVelocity({ x: 0, y: 1 }, speed)).toEqual({ x: 0, y: 250 });

    const diag1 = movementVelocity({ x: 1, y: 1 }, speed);
    expect(diag1.x).toBeCloseTo(176.776695, 4);
    expect(diag1.y).toBeCloseTo(176.776695, 4);
    expect(Math.hypot(diag1.x, diag1.y)).toBeCloseTo(speed, 5);

    const diag2 = movementVelocity({ x: -1, y: 1 }, speed);
    expect(diag2.x).toBeCloseTo(-176.776695, 4);
    expect(diag2.y).toBeCloseTo(176.776695, 4);
    expect(Math.hypot(diag2.x, diag2.y)).toBeCloseTo(speed, 5);

    const diag3 = movementVelocity({ x: -1, y: -1 }, speed);
    expect(Math.hypot(diag3.x, diag3.y)).toBeCloseTo(speed, 5);
  });

  it('computes enemy chase velocity and stops on coincident position or dead player', () => {
    const chase = chaseVelocity({ x: 0, y: 0 }, { x: 3, y: 4 }, 100);
    expect(chase.x).toBeCloseTo(60, 5);
    expect(chase.y).toBeCloseTo(80, 5);

    expect(chaseVelocity({ x: 20, y: 30 }, { x: 20, y: 30 }, 94)).toEqual({ x: 0, y: 0 });
    expect(chaseVelocity({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, true)).toEqual({ x: 0, y: 0 });
  });
});
