export type WeaponId = 'orb' | 'slash' | 'orbital' | 'mine';

export const MAX_WEAPON_LEVEL = 5;

export type WeaponStats = {
  id: WeaponId;
  level: number;
  damage: number;
  cooldownMs: number;
  count: number;
  rangePx: number;
  speedPxSec: number;
  knockbackPxSec: number;
};

export type WeaponModifiers = {
  damageBonus: number;
  cooldownReductionMs: number;
};

export type WeaponInventory = Record<WeaponId, number>;

const ORBITAL_KNOCKBACK = [115, 125, 135, 145, 160] as const;

export function createWeaponInventory(): WeaponInventory {
  return {
    orb: 1,
    slash: 0,
    orbital: 0,
    mine: 0,
  };
}

export function canUpgradeWeapon(inventory: WeaponInventory, id: WeaponId): boolean {
  const current = inventory[id];
  return Number.isInteger(current) && current >= 0 && current < MAX_WEAPON_LEVEL;
}

export function upgradeWeapon(inventory: WeaponInventory, id: WeaponId): number {
  if (!canUpgradeWeapon(inventory, id)) {
    throw new Error(`Cannot upgrade weapon ${id} from level ${inventory[id]}`);
  }
  const next = Math.min(MAX_WEAPON_LEVEL, inventory[id] + 1);
  inventory[id] = next;
  return next;
}

export function computeWeaponStats(id: WeaponId, level: number): WeaponStats {
  if (!Number.isInteger(level) || level < 1 || level > MAX_WEAPON_LEVEL) {
    throw new Error(`Invalid weapon level: ${level}`);
  }
  const step = level - 1;

  if (id === 'orb') {
    return {
      id,
      level,
      damage: 26 + step * 9,
      cooldownMs: 760 - step * 75,
      count: level >= 5 ? 3 : level >= 3 ? 2 : 1,
      rangePx: 440 + step * 30,
      speedPxSec: 420 + step * 45,
      knockbackPxSec: 60 + step * 10,
    };
  }

  if (id === 'slash') {
    return {
      id,
      level,
      damage: 34 + step * 14,
      cooldownMs: 900 - step * 75,
      count: level >= 4 ? 2 : 1,
      rangePx: 90 + step * 14,
      speedPxSec: 0,
      knockbackPxSec: 260 + step * 35,
    };
  }

  if (id === 'mine') {
    return {
      id,
      level,
      damage: 48 + step * 18,
      cooldownMs: 1200 - step * 125,
      count: level >= 4 ? 2 : 1,
      rangePx: 68 + step * 12,
      speedPxSec: 0,
      knockbackPxSec: 260 + step * 25,
    };
  }

  return {
    id,
    level,
    damage: 20 + step * 7,
    cooldownMs: 420 - step * 35,
    count: level >= 5 ? 4 : level >= 3 ? 3 : 2,
    rangePx: 74 + step * 9,
    speedPxSec: Number((3.6 + step * 0.6).toFixed(4)),
    knockbackPxSec: ORBITAL_KNOCKBACK[step]!,
  };
}

export function applyWeaponModifiers(stats: WeaponStats, mods: WeaponModifiers): WeaponStats {
  const dmgBonus = Number.isFinite(mods.damageBonus) ? Math.max(0, mods.damageBonus) : 0;
  const cdRed = Number.isFinite(mods.cooldownReductionMs) ? Math.max(0, mods.cooldownReductionMs) : 0;
  return {
    ...stats,
    damage: Math.max(1, stats.damage + dmgBonus),
    cooldownMs: Math.max(180, stats.cooldownMs - cdRed),
  };
}
