import { describe, expect, it } from 'vitest';
import { createPlayerState } from '../src/domain/combat';
import {
  applyUpgradeChoice,
  createPassiveStats,
  getAvailableUpgrades,
  rollCombatDamage,
  rollUpgradeChoices,
} from '../src/domain/upgrades';
import {
  applyWeaponModifiers,
  canUpgradeWeapon,
  computeWeaponStats,
  createWeaponInventory,
  getDualSlashStage,
  MAX_WEAPON_LEVEL,
  upgradeWeapon,
} from '../src/domain/weapons';

describe('weapons domain scaling and inventory', () => {
  it('starts with level 1 orb for naruto or dual_slash for kirito', () => {
    const inv = createWeaponInventory();
    expect(inv).toEqual({ orb: 1, slash: 0, orbital: 0, mine: 0, dual_slash: 0 });
    expect(createWeaponInventory('dual_slash')).toEqual({ orb: 0, slash: 0, orbital: 0, mine: 0, dual_slash: 1 });
    expect(canUpgradeWeapon(inv, 'orb')).toBe(true);
    expect(canUpgradeWeapon(inv, 'slash')).toBe(true);
    expect(canUpgradeWeapon(inv, 'orbital')).toBe(true);
    expect(canUpgradeWeapon(inv, 'mine')).toBe(true);
    expect(canUpgradeWeapon(inv, 'dual_slash')).toBe(true);
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

  it('computes rebalanced flat stats for orb, slash, orbital, and mine across levels 1..5', () => {
    expect(computeWeaponStats('orb', 1)).toMatchObject({
      damage: 26, cooldownMs: 760, speedPxSec: 420, rangePx: 440, knockbackPxSec: 60, count: 1,
    });
    expect(computeWeaponStats('orb', 5)).toMatchObject({
      damage: 62, cooldownMs: 460, speedPxSec: 600, rangePx: 560, knockbackPxSec: 100, count: 3,
    });

    expect(computeWeaponStats('slash', 1)).toMatchObject({
      damage: 34, cooldownMs: 900, rangePx: 90, knockbackPxSec: 260, count: 1,
    });
    expect(computeWeaponStats('slash', 4)).toMatchObject({
      damage: 76, cooldownMs: 675, rangePx: 132, knockbackPxSec: 365, count: 2,
    });

    expect(computeWeaponStats('orbital', 1)).toMatchObject({
      damage: 20, cooldownMs: 420, rangePx: 74, speedPxSec: 3.6, knockbackPxSec: 115, count: 2,
    });
    expect(computeWeaponStats('orbital', 5)).toMatchObject({
      damage: 48, cooldownMs: 280, rangePx: 110, speedPxSec: 6, knockbackPxSec: 160, count: 4,
    });

    const mine1 = computeWeaponStats('mine', 1);
    const mine5 = computeWeaponStats('mine', 5);
    expect(mine1).toMatchObject({ id: 'mine', damage: 48, cooldownMs: 1200, count: 1, rangePx: 68 });
    expect(mine5).toMatchObject({ id: 'mine', damage: 120, cooldownMs: 700, count: 2, rangePx: 116 });

    const boosted = applyWeaponModifiers(mine1, { damageBonus: 18, cooldownReductionMs: 250 });
    expect(boosted.damage).toBe(66);
    expect(boosted.cooldownMs).toBe(950);

    const floored = applyWeaponModifiers(computeWeaponStats('orbital', 5), {
      damageBonus: 0,
      cooldownReductionMs: 250,
    });
    expect(floored.cooldownMs).toBe(180);

    expect(() => computeWeaponStats('orb', 0)).toThrow();
    expect(() => computeWeaponStats('mine', 6)).toThrow();

    expect(computeWeaponStats('dual_slash', 1)).toMatchObject({ id: 'dual_slash', damage: 32, cooldownMs: 880, count: 1 });
    expect(computeWeaponStats('dual_slash', 3)).toMatchObject({ id: 'dual_slash', damage: 36, cooldownMs: 960, count: 2 });
    expect(computeWeaponStats('dual_slash', 5)).toMatchObject({ id: 'dual_slash', damage: 110, cooldownMs: 820, count: 1 });

    expect(getDualSlashStage(1)).toEqual({ animKey: 'kirito-wave-lv1', waves: [{ kind: 'ice', releaseDelayMs: 180 }], pierceCount: 1 });
    expect(getDualSlashStage(3)).toEqual({ animKey: 'kirito-wave-lv2', waves: [{ kind: 'ice', releaseDelayMs: 180 }, { kind: 'dark_fire', releaseDelayMs: 450 }], pierceCount: 1 });
    expect(getDualSlashStage(5)).toEqual({ animKey: 'kirito-wave-lv3', waves: [{ kind: 'dual_x', releaseDelayMs: 280 }], pierceCount: 8 });
  });
});

describe('11-card flat upgrades, Max Lv.5 cap, heavy strike, and smart weighted roll', () => {
  it('exposes all 11 cards and filters out maxed weapons and maxed Lv.5 passives', () => {
    const passives = createPassiveStats();
    const fullAvail = getAvailableUpgrades(createWeaponInventory(), passives);
    expect(fullAvail).toHaveLength(11);
    for (const c of fullAvail) {
      expect(c.icon.startsWith('icon-')).toBe(true);
    }

    const kiritoAvail = getAvailableUpgrades(createWeaponInventory('dual_slash'), passives, 'kirito');
    expect(kiritoAvail.some((c) => c.id === 'weapon_dual_slash')).toBe(true);
    expect(kiritoAvail.some((c) => c.id === 'weapon_orb')).toBe(false);

    const inv = { orb: 5, slash: 2, orbital: 5, mine: 5, dual_slash: 0 };
    passives.levels.stat_damage = 5;
    passives.levels.stat_magnet = 5;
    const available = getAvailableUpgrades(inv, passives);
    expect(available.map((u) => u.id)).toEqual([
      'weapon_slash',
      'stat_max_hp',
      'stat_damage_reduction',
      'stat_cooldown',
      'stat_move_speed',
      'stat_heavy_strike',
    ]);

    const allMaxed = { orb: 5, slash: 5, orbital: 5, mine: 5, dual_slash: 5 };
    const statOnly = rollUpgradeChoices(allMaxed, passives, { playerLevel: 10, hpRatio: 1 }, 3, () => 0.2);
    expect(statOnly).toHaveLength(3);
    expect(statOnly.every((c) => c.category === 'passive')).toBe(true);
  });

  it('applies escalating/diminishing flat curves across Lv.1..5 and triggers deterministic heavy strike', () => {
    const inv = createWeaponInventory();
    const player = createPlayerState(100);
    player.hp = 50;
    const passives = createPassiveStats();

    for (let i = 0; i < 5; i++) {
      applyUpgradeChoice('stat_max_hp', inv, player, passives);
      applyUpgradeChoice('stat_damage_reduction', inv, player, passives);
      applyUpgradeChoice('stat_damage', inv, player, passives);
      applyUpgradeChoice('stat_cooldown', inv, player, passives);
      applyUpgradeChoice('stat_move_speed', inv, player, passives);
      applyUpgradeChoice('stat_magnet', inv, player, passives);
      applyUpgradeChoice('stat_heavy_strike', inv, player, passives);
    }

    expect(player.maxHp).toBe(260);
    expect(player.hp).toBe(210);
    expect(passives.damageReduction).toBe(18);
    expect(passives.damageBonus).toBe(36);
    expect(passives.cooldownReductionMs).toBe(250);
    expect(passives.moveSpeedBonusPxSec).toBe(100);
    expect(passives.pickupRadiusBonusPx).toBe(250 + 5 * 12);
    expect(passives.heavyStrikeEvery).toBe(3);
    expect(passives.heavyStrikeBonus).toBe(145);

    expect(rollCombatDamage(20, passives)).toEqual({ damage: 56, critical: false });
    expect(rollCombatDamage(20, passives)).toEqual({ damage: 56, critical: false });
    expect(rollCombatDamage(20, passives)).toEqual({ damage: 201, critical: true });
  });

  it('guarantees 2 weapons + 1 passive on Lv.2..4 and 1 weapon + 1 passive + 1 flex on Lv.5+', () => {
    const inv = createWeaponInventory();
    const passives = createPassiveStats();
    const early = rollUpgradeChoices(inv, passives, { playerLevel: 2, hpRatio: 1 }, 3, () => 0);
    expect(early).toHaveLength(3);
    expect(early.filter((c) => c.category === 'weapon')).toHaveLength(2);
    expect(early.filter((c) => c.category === 'passive')).toHaveLength(1);

    const mid = rollUpgradeChoices(inv, passives, { playerLevel: 5, hpRatio: 1 }, 3, () => 0.5);
    expect(mid).toHaveLength(3);
    expect(mid.filter((c) => c.category === 'weapon').length).toBeGreaterThanOrEqual(1);
    expect(mid.filter((c) => c.category === 'passive').length).toBeGreaterThanOrEqual(1);
  });
});
