import { describe, expect, it } from 'vitest';
import { createPlayerState } from '../src/domain/combat';
import { getHeroConfig } from '../src/domain/heroes';
import { applyUpgradeChoice, createPassiveStats, getAvailableUpgrades } from '../src/domain/upgrades';
import { createWeaponInventory } from '../src/domain/weapons';

describe('Kirito starts with sword waves and earns other abilities', () => {
  it('starts with only dual_slash and offers Dash once to Kirito', () => {
    const inventory = createWeaponInventory(getHeroConfig('kirito').startingWeaponId);
    const passives = createPassiveStats();
    expect(Object.entries(inventory).filter(([, level]) => level > 0)).toEqual([['dual_slash', 1]]);
    expect(passives.phantomDashUnlocked).toBe(false);
    expect(getAvailableUpgrades(inventory, passives, 'kirito').some(c => c.id === 'skill_phantom_dash')).toBe(true);
    expect(getAvailableUpgrades(inventory, passives, 'naruto').some(c => c.id === 'skill_phantom_dash')).toBe(false);
    applyUpgradeChoice('skill_phantom_dash', inventory, createPlayerState(140), passives);
    expect(passives.phantomDashUnlocked).toBe(true);
    expect(getAvailableUpgrades(inventory, passives, 'kirito').some(c => c.id === 'skill_phantom_dash')).toBe(false);
    expect(() => applyUpgradeChoice('skill_phantom_dash', inventory, createPlayerState(140), passives)).toThrow();
    expect(createPassiveStats().phantomDashUnlocked).toBe(false);
  });
  it('keeps other weapons locked until their own upgrade is selected', () => {
    const inventory = createWeaponInventory('dual_slash');
    const passives = createPassiveStats();
    const before = { ...inventory };
    applyUpgradeChoice('weapon_orbital', inventory, createPlayerState(140), passives);
    expect(inventory).toEqual({ ...before, orbital: 1 });
    expect(passives.phantomDashUnlocked).toBe(false);
  });
});
