import type { DualWaveKind } from './statusEffects';

export type WeaponId = 'orb' | 'slash' | 'orbital' | 'mine' | 'dual_slash';

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

export type DualSlashStage = {
  animKey: 'kirito-wave-lv1' | 'kirito-wave-lv2' | 'kirito-wave-lv3';
  waves: ReadonlyArray<{ kind: DualWaveKind; releaseDelayMs: number }>;
  pierceCount: number;
  sizeScale: number;
};

const ORBITAL_KNOCKBACK = [115, 125, 135, 145, 160] as const;
const DUAL_PIERCE = [1, 2, 3, 4, 8] as const;
const DUAL_SIZE = [1, 1.12, 1.24, 1.36, 1.15] as const;
const DUAL_SLASH_TABLE: ReadonlyArray<Omit<WeaponStats, 'id' | 'level'>> = [
  { damage: 32, cooldownMs: 880, count: 1, rangePx: 460, speedPxSec: 460, knockbackPxSec: 70 },
  { damage: 28, cooldownMs: 940, count: 2, rangePx: 490, speedPxSec: 490, knockbackPxSec: 85 },
  { damage: 38, cooldownMs: 880, count: 2, rangePx: 525, speedPxSec: 520, knockbackPxSec: 100 },
  { damage: 48, cooldownMs: 820, count: 2, rangePx: 560, speedPxSec: 550, knockbackPxSec: 115 },
  { damage: 115, cooldownMs: 780, count: 1, rangePx: 600, speedPxSec: 580, knockbackPxSec: 135 },
];

export function createWeaponInventory(startingWeapon: WeaponId = 'orb'): WeaponInventory {
  return {
    orb: startingWeapon === 'orb' ? 1 : 0,
    slash: startingWeapon === 'slash' ? 1 : 0,
    orbital: startingWeapon === 'orbital' ? 1 : 0,
    mine: startingWeapon === 'mine' ? 1 : 0,
    dual_slash: startingWeapon === 'dual_slash' ? 1 : 0,
  };
}

export function getDualSlashStage(level: number): DualSlashStage {
  const step = Math.max(0, Math.min(4, Math.floor(level) - 1));
  if (level >= 5) {
    return {
      animKey: 'kirito-wave-lv3',
      waves: [{ kind: 'dual_x', releaseDelayMs: 280 }],
      pierceCount: DUAL_PIERCE[4],
      sizeScale: DUAL_SIZE[4],
    };
  }
  if (level >= 2) {
    return {
      animKey: 'kirito-wave-lv2',
      waves: [
        { kind: 'ice', releaseDelayMs: 180 },
        { kind: 'dark_fire', releaseDelayMs: 450 },
      ],
      pierceCount: DUAL_PIERCE[step]!,
      sizeScale: DUAL_SIZE[step]!,
    };
  }
  return {
    animKey: 'kirito-wave-lv1',
    waves: [{ kind: 'ice', releaseDelayMs: 180 }],
    pierceCount: DUAL_PIERCE[0],
    sizeScale: DUAL_SIZE[0],
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

  if (id === 'dual_slash') {
    return { id, level, ...DUAL_SLASH_TABLE[step]! };
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
