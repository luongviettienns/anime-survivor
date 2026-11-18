import { describe, expect, it } from 'vitest';
import { applyContactDamage, createPlayerState } from '../src/domain/combat';
import {
  collectPickup,
  computeEliteDrops,
  computeKillDrops,
  createPickupState,
  magnetVelocity,
} from '../src/domain/pickups';
import { createProgression } from '../src/domain/progression';

describe('pickup collection, deterministic drops, and progression rules', () => {
  it('collects XP gem once, queues multiple levels, and does NOT heal HP on level-up', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 30, 0, 800);
    expect(player.hp).toBe(70);

    const progression = createProgression();
    const gem = createPickupState(1, 'xp', 22, 100, 100);

    const first = collectPickup(gem, player, progression);
    expect(first.collected).toBe(true);
    expect(first.levelsGained).toBe(2);
    expect(progression.level).toBe(3);
    expect(progression.xp).toBe(0);
    expect(progression.pendingUpgrades).toBe(2);
    expect(player.hp).toBe(70);
    expect(gem.state).toBe('collected');

    const duplicate = collectPickup(gem, player, progression);
    expect(duplicate.collected).toBe(false);
    expect(progression.level).toBe(3);
    expect(progression.pendingUpgrades).toBe(2);
  });

  it('collects heal and magnet pickups once, clamps HP at maxHp, and preserves i-frames', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 10, 50, 800);
    expect(player.hp).toBe(90);
    expect(player.invulnerableUntilMs).toBe(850);

    const progression = createProgression();
    const heal1 = createPickupState(2, 'heal', 30, 120, 120);
    const res1 = collectPickup(heal1, player, progression);
    expect(res1).toEqual({
      collected: true,
      type: 'heal',
      levelsGained: 0,
      hpBefore: 90,
      hpAfter: 100,
    });
    expect(player.hp).toBe(100);
    expect(player.invulnerableUntilMs).toBe(850);

    const healFull = createPickupState(3, 'heal', 30, 140, 140);
    expect(collectPickup(healFull, player, progression).collected).toBe(true);
    expect(collectPickup(healFull, player, progression).collected).toBe(false);

    const magnet = createPickupState(5, 'magnet', 1, 160, 160);
    expect(collectPickup(magnet, player, progression)).toEqual({
      collected: true,
      type: 'magnet',
      levelsGained: 0,
      hpBefore: 100,
      hpAfter: 100,
    });
    expect(collectPickup(magnet, player, progression).collected).toBe(false);
  });

  it('computes deterministic heal drops every 25 kills, magnet drops every 90 kills, and elite drops', () => {
    expect(computeKillDrops(0)).toEqual([]);
    expect(computeKillDrops(24)).toEqual([]);
    expect(computeKillDrops(25)).toEqual(['heal']);
    expect(computeKillDrops(50)).toEqual(['heal']);
    expect(computeKillDrops(90)).toEqual(['magnet']);
    expect(computeKillDrops(450)).toEqual(['heal', 'magnet']);
    expect(computeEliteDrops(1)).toEqual(['heal']);
    expect(computeEliteDrops(2)).toEqual(['heal', 'magnet']);
    expect(computeEliteDrops(3)).toEqual(['heal']);
    expect(computeEliteDrops(4)).toEqual(['heal', 'magnet']);
  });

  it('rejects pickup collection when player is dead', () => {
    const player = createPlayerState(10);
    applyContactDamage(player, 10, 0, 800);
    expect(player.alive).toBe(false);

    const progression = createProgression();
    const gem = createPickupState(4, 'xp', 5, 50, 50);
    expect(collectPickup(gem, player, progression).collected).toBe(false);
    expect(gem.state).toBe('ground');
  });

  it('computes magnetic pull velocity when pickup is inside magnet radius', () => {
    const vel = magnetVelocity({ x: 100, y: 100 }, { x: 160, y: 180 }, 120, 300);
    expect(vel.x).toBeCloseTo(180, 5);
    expect(vel.y).toBeCloseTo(240, 5);
  });

  it('returns zero magnet velocity when outside radius, at zero distance, or given invalid params', () => {
    expect(magnetVelocity({ x: 0, y: 0 }, { x: 200, y: 0 }, 100, 300)).toEqual({ x: 0, y: 0 });
    expect(magnetVelocity({ x: 50, y: 50 }, { x: 50, y: 50 }, 100, 300)).toEqual({ x: 0, y: 0 });
    expect(magnetVelocity({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, 300)).toEqual({ x: 0, y: 0 });
    expect(magnetVelocity({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, -50)).toEqual({ x: 0, y: 0 });
  });
});
