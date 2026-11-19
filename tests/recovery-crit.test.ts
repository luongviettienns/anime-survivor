import { describe, expect, it } from 'vitest';
import { applyPassiveRecovery, createPlayerState } from '../src/domain/combat';
import {
  applyUpgradeChoice,
  CRIT_DAMAGE_MULTIPLIER,
  createPassiveStats,
  MAX_CRIT_CHANCE,
  rollCombatDamage,
} from '../src/domain/upgrades';
import { createWeaponInventory } from '../src/domain/weapons';

describe('stat_max_hp no-heal, stat_recovery, and capped crit', () => {
  it('stat_max_hp increases maxHp to 260 across 5 levels without healing current hp', () => {
    const inv = createWeaponInventory();
    const player = createPlayerState(100);
    player.hp = 50;
    const passives = createPassiveStats();

    for (let i = 0; i < 5; i++) {
      applyUpgradeChoice('stat_max_hp', inv, player, passives);
    }

    expect(player.maxHp).toBe(260);
    expect(player.hp).toBe(50);
  });

  it('stat_recovery Lv.1..5 grants [1, 2, 3, 4, 6] recoveryPer3Sec', () => {
    const inv = createWeaponInventory();
    const player = createPlayerState(100);
    const passives = createPassiveStats();
    const actual: number[] = [];

    for (let i = 0; i < 5; i++) {
      applyUpgradeChoice('stat_recovery', inv, player, passives);
      actual.push(passives.recoveryPer3Sec);
    }

    expect(actual).toEqual([1, 2, 3, 4, 6]);
  });

  it('applyPassiveRecovery ticks every 3000ms, preserves remainder, clamps to maxHp, and handles edge cases', () => {
    const player = createPlayerState(100);
    player.hp = 80;
    const passives = { recoveryPer3Sec: 4, recoveryTimerMs: 0 };

    expect(applyPassiveRecovery(player, passives, 2999)).toBe(0);
    expect(player.hp).toBe(80);
    expect(passives.recoveryTimerMs).toBe(2999);

    expect(applyPassiveRecovery(player, passives, 1)).toBe(4);
    expect(player.hp).toBe(84);
    expect(passives.recoveryTimerMs).toBe(0);

    expect(applyPassiveRecovery(player, passives, 3500)).toBe(4);
    expect(player.hp).toBe(88);
    expect(passives.recoveryTimerMs).toBe(500);

    passives.recoveryTimerMs = 0;
    expect(applyPassiveRecovery(player, passives, 6000)).toBe(8);
    expect(player.hp).toBe(96);
    expect(passives.recoveryTimerMs).toBe(0);

    // Clamps to maxHp
    expect(applyPassiveRecovery(player, passives, 6000)).toBe(4);
    expect(player.hp).toBe(100);
    expect(passives.recoveryTimerMs).toBe(0);

    // Resets timer when already full HP
    passives.recoveryTimerMs = 1500;
    expect(applyPassiveRecovery(player, passives, 1500)).toBe(0);
    expect(passives.recoveryTimerMs).toBe(0);

    // Edge cases: dead player, zero/negative recovery, zero/negative delta
    player.hp = 50;
    expect(applyPassiveRecovery(player, { recoveryPer3Sec: 0, recoveryTimerMs: 0 }, 3000)).toBe(0);
    expect(applyPassiveRecovery(player, passives, 0)).toBe(0);
    expect(applyPassiveRecovery(player, passives, -100)).toBe(0);
    player.alive = false;
    expect(applyPassiveRecovery(player, passives, 3000)).toBe(0);
    expect(player.hp).toBe(50);
  });

  it('rollCombatDamage uses single-probability crit capped at MAX_CRIT_CHANCE = 0.30', () => {
    expect(MAX_CRIT_CHANCE).toBe(0.3);
    expect(CRIT_DAMAGE_MULTIPLIER).toBe(1.5);

    const passives = createPassiveStats();
    passives.damageBonus = 5;

    // critChance = 0 never crits even when rng returns 0
    passives.critChance = 0;
    expect(rollCombatDamage(20, passives, () => 0)).toEqual({ damage: 25, critical: false });

    // critChance = 0.2: rng < 0.2 crits, rng >= 0.2 does not
    passives.critChance = 0.2;
    expect(rollCombatDamage(20, passives, () => 0.19)).toEqual({
      damage: Math.ceil((20 + 5) * 1.5),
      critical: true,
    });
    expect(rollCombatDamage(20, passives, () => 0.2)).toEqual({ damage: 25, critical: false });

    // Hard cap MAX_CRIT_CHANCE = 0.30
    passives.critChance = 0.85;
    expect(rollCombatDamage(20, passives, () => 0.3)).toEqual({ damage: 25, critical: false });
    expect(rollCombatDamage(20, passives, () => 0.29)).toEqual({ damage: 38, critical: true });

    // Negative / NaN critChance never crits
    passives.critChance = -0.5;
    expect(rollCombatDamage(20, passives, () => 0)).toEqual({ damage: 25, critical: false });
    passives.critChance = Number.NaN;
    expect(rollCombatDamage(20, passives, () => 0)).toEqual({ damage: 25, critical: false });
  });
});
