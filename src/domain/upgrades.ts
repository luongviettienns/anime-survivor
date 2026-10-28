import type { PlayerState } from './combat';
import { canUpgradeWeapon, upgradeWeapon, type WeaponId, type WeaponInventory } from './weapons';

export type UpgradeId =
  | 'weapon_orb'
  | 'weapon_slash'
  | 'weapon_orbital'
  | 'stat_max_hp'
  | 'stat_move_speed';

export type PassiveStats = {
  moveSpeedMultiplier: number;
  pickupRadiusBonusPx: number;
};

export type UpgradeChoice = {
  id: UpgradeId;
  title: string;
  description: string;
  nextLevel?: number;
};

const WEAPON_UPGRADE_META: ReadonlyArray<{
  upgradeId: 'weapon_orb' | 'weapon_slash' | 'weapon_orbital';
  weaponId: WeaponId;
  title: string;
  unlockDesc: string;
  levelDesc: string;
}> = [
  {
    upgradeId: 'weapon_orb',
    weaponId: 'orb',
    title: 'Rasengan Chakra Orb',
    unlockDesc: 'Unlock auto-homing chakra orb.',
    levelDesc: '+8 Damage, faster cooldown, extra orbs at Lv3/Lv5.',
  },
  {
    upgradeId: 'weapon_slash',
    weaponId: 'slash',
    title: 'Kunai Chakra Slash',
    unlockDesc: 'Unlock close-range kunai arc slash with heavy knockback.',
    levelDesc: '+10 Damage, wider arc, back-slash at Lv4.',
  },
  {
    upgradeId: 'weapon_orbital',
    weaponId: 'orbital',
    title: 'Shadow Shuriken Ring',
    unlockDesc: 'Summon orbiting shadow shuriken that slice nearby foes.',
    levelDesc: '+6 Damage, faster spin, extra blades at Lv2/Lv4.',
  },
];

export function createPassiveStats(): PassiveStats {
  return {
    moveSpeedMultiplier: 1,
    pickupRadiusBonusPx: 0,
  };
}

export function getAvailableUpgrades(inventory: WeaponInventory): UpgradeChoice[] {
  const choices: UpgradeChoice[] = [];

  for (const meta of WEAPON_UPGRADE_META) {
    if (canUpgradeWeapon(inventory, meta.weaponId)) {
      const nextLevel = inventory[meta.weaponId] + 1;
      choices.push({
        id: meta.upgradeId,
        title: `${meta.title} Lv.${nextLevel}`,
        description: nextLevel === 1 ? meta.unlockDesc : meta.levelDesc,
        nextLevel,
      });
    }
  }

  choices.push(
    {
      id: 'stat_max_hp',
      title: 'Vitality Seal',
      description: '+20 Max HP and restore 20 HP immediately.',
    },
    {
      id: 'stat_move_speed',
      title: 'Swift Footwork',
      description: '+10% Move Speed and +16px Pickup Magnet radius.',
    }
  );

  return choices;
}

export function rollUpgradeChoices(
  inventory: WeaponInventory,
  maxChoices = 3,
  rng: () => number = Math.random
): UpgradeChoice[] {
  const pool = [...getAvailableUpgrades(inventory)];
  const count = Math.max(0, Math.min(maxChoices, pool.length));
  for (let i = 0; i < count; i++) {
    const raw = rng();
    const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999, raw)) : 0;
    const swapIdx = i + Math.floor(clamped * (pool.length - i));
    const temp = pool[i]!;
    pool[i] = pool[swapIdx]!;
    pool[swapIdx] = temp;
  }
  return pool.slice(0, count);
}

export function applyUpgradeChoice(
  choiceId: UpgradeId,
  inventory: WeaponInventory,
  player: PlayerState,
  passives: PassiveStats
): void {
  if (choiceId === 'weapon_orb') {
    upgradeWeapon(inventory, 'orb');
    return;
  }
  if (choiceId === 'weapon_slash') {
    upgradeWeapon(inventory, 'slash');
    return;
  }
  if (choiceId === 'weapon_orbital') {
    upgradeWeapon(inventory, 'orbital');
    return;
  }
  if (choiceId === 'stat_max_hp') {
    player.maxHp += 20;
    player.hp = Math.min(player.maxHp, player.hp + 20);
    return;
  }
  passives.moveSpeedMultiplier = Number((passives.moveSpeedMultiplier + 0.1).toFixed(2));
  passives.pickupRadiusBonusPx += 16;
}
