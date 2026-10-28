import { describe, expect, it } from 'vitest';
import { createPlayerState } from '../src/domain/combat';
import {
  applyUpgradeChoice,
  createPassiveStats,
  getAvailableUpgrades,
  rollUpgradeChoices,
} from '../src/domain/upgrades';
import {
  canUpgradeWeapon,
  computeWeaponStats,
  createWeaponInventory,
  MAX_WEAPON_LEVEL,
  upgradeWeapon,
} from '../src/domain/weapons';

describe('weapons domain scaling and inventory', () => {
  it('starts with level 1 orb and locked slash/orbital', () => {
    const inv = createWeaponInventory();
    expect(inv).toEqual({ orb: 1, slash: 0, orbital: 0 });
    expect(canUpgradeWeapon(inv, 'orb')).toBe(true);
    expect(canUpgradeWeapon(inv, 'slash')).toBe(true);
    expect(canUpgradeWeapon(inv, 'orbital')).toBe(true);
  });

  it('upgrades weapons up to MAX_WEAPON_LEVEL and rejects further upgrades', () => {
    const inv = createWeaponInventory();
    for (let lv = 2; lv <= MAX_WEAPON_LEVEL; lv++) {
      expect(upgradeWeapon(inv, 'orb')).toBe(lv);
    }
    expect(inv.orb).toBe(MAX_WEAPON_LEVEL);
    expect(canUpgradeWeapon(inv, 'orb')).toBe(false);
    expect(() => upgradeWeapon(inv, 'orb')).toThrow();
  });

  it('computes deterministic stats for orb, slash, and orbital across levels 1..5', () => {
    const orb1 = computeWeaponStats('orb', 1);
    const orb3 = computeWeaponStats('orb', 3);
    const orb5 = computeWeaponStats('orb', 5);
    expect(orb1).toEqual({
      id: 'orb',
      level: 1,
      damage: 28,
      cooldownMs: 380,
      count: 1,
      rangePx: 520,
      speedPxSec: 560,
      knockbackPxSec: 60,
    });
    expect(orb3.count).toBe(2);
    expect(orb5.count).toBe(3);
    expect(orb5.damage).toBe(60);
    expect(orb5.cooldownMs).toBe(240);

    const slash1 = computeWeaponStats('slash', 1);
    const slash4 = computeWeaponStats('slash', 4);
    expect(slash1.damage).toBe(34);
    expect(slash1.count).toBe(1);
    expect(slash1.rangePx).toBe(84);
    expect(slash4.count).toBe(2);
    expect(slash4.damage).toBe(64);
    expect(slash4.cooldownMs).toBe(580);

    const orbital1 = computeWeaponStats('orbital', 1);
    const orbital2 = computeWeaponStats('orbital', 2);
    const orbital5 = computeWeaponStats('orbital', 5);
    expect(orbital1.count).toBe(1);
    expect(orbital2.count).toBe(2);
    expect(orbital5.count).toBe(3);
    expect(orbital5.rangePx).toBe(96);
    expect(orbital5.speedPxSec).toBeCloseTo(4.6, 5);

    expect(() => computeWeaponStats('orb', 0)).toThrow();
    expect(() => computeWeaponStats('orb', 6)).toThrow();
  });
});

describe('upgrades rolling and application', () => {
  it('filters out maxed weapons and rolls distinct upgrade choices deterministically', () => {
    const inv = { orb: 5, slash: 2, orbital: 5 };
    const available = getAvailableUpgrades(inv);
    expect(available.map((u) => u.id)).toEqual(['weapon_slash', 'stat_max_hp', 'stat_move_speed']);
    expect(available[0]?.nextLevel).toBe(3);

    const choices = rollUpgradeChoices(inv, 3, () => 0);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((c) => c.id)).size).toBe(3);

    const allMaxed = { orb: 5, slash: 5, orbital: 5 };
    const statOnly = rollUpgradeChoices(allMaxed, 3, () => 0.5);
    expect(statOnly.map((c) => c.id).sort()).toEqual(['stat_max_hp', 'stat_move_speed']);
  });

  it('applies weapon and passive stat upgrades to inventory, player, and passives', () => {
    const inv = createWeaponInventory();
    const player = createPlayerState(100);
    player.hp = 70;
    const passives = createPassiveStats();

    applyUpgradeChoice('weapon_slash', inv, player, passives);
    expect(inv.slash).toBe(1);

    applyUpgradeChoice('stat_max_hp', inv, player, passives);
    expect(player.maxHp).toBe(120);
    expect(player.hp).toBe(90);

    applyUpgradeChoice('stat_move_speed', inv, player, passives);
    expect(passives.moveSpeedMultiplier).toBe(1.1);
    expect(passives.pickupRadiusBonusPx).toBe(16);
  });
});
