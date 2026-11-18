import { describe, expect, it } from 'vitest';
import { createPlayerState } from '../src/domain/combat';
import { getHeroConfig } from '../src/domain/heroes';
import { applyUpgradeChoice, createPassiveStats, getAvailableUpgrades } from '../src/domain/upgrades';
import { createWeaponInventory } from '../src/domain/weapons';

describe('Kirito exclusive skills, Lv.1..5 Phantom Dash, and Naruto ninja gating', () => {
  it('starts Kirito with dual_slash Lv.1 only and upgrades Phantom Dash from Lv.1 to Lv.5', () => {
    const inventory = createWeaponInventory(getHeroConfig('kirito').startingWeaponId);
    const passives = createPassiveStats();

    expect(Object.entries(inventory).filter(([, level]) => level > 0)).toEqual([['dual_slash', 1]]);
    expect(passives.phantomDashLevel).toBe(0);

    const kiritoIds = getAvailableUpgrades(inventory, passives, 'kirito').map((c) => c.id);
    expect(kiritoIds).toContain('skill_phantom_dash');
    expect(kiritoIds).toContain('weapon_dual_slash');
    expect(kiritoIds).not.toContain('weapon_orb');
    expect(kiritoIds).not.toContain('weapon_clone');
    expect(kiritoIds).not.toContain('weapon_orbital');
    expect(kiritoIds).not.toContain('weapon_mine');

    for (let lv = 1; lv <= 5; lv++) {
      const card = getAvailableUpgrades(inventory, passives, 'kirito').find((c) => c.id === 'skill_phantom_dash');
      expect(card?.nextLevel).toBe(lv);
      applyUpgradeChoice('skill_phantom_dash', inventory, createPlayerState(140), passives);
      expect(passives.phantomDashLevel).toBe(lv);
    }

    expect(getAvailableUpgrades(inventory, passives, 'kirito').some((c) => c.id === 'skill_phantom_dash')).toBe(false);
    expect(() => applyUpgradeChoice('skill_phantom_dash', inventory, createPlayerState(140), passives)).toThrow();
    expect(createPassiveStats().phantomDashLevel).toBe(0);
  });

  it('keeps ninja weapons Naruto-exclusive while keeping all 7 passive stats shared', () => {
    const narutoInv = createWeaponInventory('orb');
    const kiritoInv = createWeaponInventory('dual_slash');
    const passives = createPassiveStats();

    const narutoChoices = getAvailableUpgrades(narutoInv, passives, 'naruto');
    const kiritoChoices = getAvailableUpgrades(kiritoInv, passives, 'kirito');

    expect(narutoChoices.filter((c) => c.category === 'weapon').map((c) => c.id)).toEqual([
      'weapon_orb',
      'weapon_clone',
      'weapon_orbital',
      'weapon_mine',
    ]);
    expect(kiritoChoices.filter((c) => c.category === 'weapon').map((c) => c.id)).toEqual([
      'skill_phantom_dash',
      'weapon_dual_slash',
    ]);

    const narutoPassives = narutoChoices.filter((c) => c.category === 'passive').map((c) => c.id);
    const kiritoPassives = kiritoChoices.filter((c) => c.category === 'passive').map((c) => c.id);
    expect(kiritoPassives).toEqual(narutoPassives);
    expect(kiritoPassives).toHaveLength(7);
  });
});
