export type WeaponId = 'orb' | 'slash' | 'orbital';

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

export type WeaponInventory = Record<WeaponId, number>;

export function createWeaponInventory(): WeaponInventory {
  return {
    orb: 1,
    slash: 0,
    orbital: 0,
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
      damage: 28 + step * 8,
      cooldownMs: Math.max(180, 380 - step * 35),
      count: level >= 5 ? 3 : level >= 3 ? 2 : 1,
      rangePx: 520,
      speedPxSec: 560,
      knockbackPxSec: 60,
    };
  }

  if (id === 'slash') {
    return {
      id,
      level,
      damage: 34 + step * 10,
      cooldownMs: Math.max(420, 820 - step * 80),
      count: level >= 4 ? 2 : 1,
      rangePx: 84 + step * 10,
      speedPxSec: 0,
      knockbackPxSec: 240 + step * 30,
    };
  }

  return {
    id: 'orbital',
    level,
    damage: 18 + step * 6,
    cooldownMs: Math.max(200, 450 - step * 40),
    count: 1 + Math.floor(level / 2),
    rangePx: 72 + step * 6,
    speedPxSec: Number((3.2 + step * 0.35).toFixed(4)),
    knockbackPxSec: 110,
  };
}
