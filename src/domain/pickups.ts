import { clampHealth, type PlayerState } from './combat';
import { applyXpGain, type RunProgression } from './progression';
import { directionFromTo, type Vec2 } from './vector';

export type PickupType = 'xp' | 'heal' | 'magnet';

export type PickupState = {
  id: number;
  type: PickupType;
  value: number;
  state: 'ground' | 'collected';
  x: number;
  y: number;
};

export function createPickupState(
  id: number,
  type: PickupType,
  value: number,
  x: number,
  y: number
): PickupState {
  if (!Number.isInteger(id) || id < 1 || !Number.isFinite(value) || value <= 0) {
    throw new Error('invalid pickup parameters');
  }
  return { id, type, value, state: 'ground', x, y };
}

export type PickupCollectionResult = {
  collected: boolean;
  type?: PickupType;
  levelsGained: number;
  hpBefore: number;
  hpAfter: number;
};

export function collectPickup(
  pickup: PickupState,
  player: PlayerState,
  progression: RunProgression
): PickupCollectionResult {
  const hpBefore = player.hp;
  if (!player.alive || pickup.state !== 'ground' || !Number.isFinite(pickup.value) || pickup.value <= 0) {
    return { collected: false, levelsGained: 0, hpBefore, hpAfter: hpBefore };
  }

  pickup.state = 'collected';

  if (pickup.type === 'xp') {
    const xpRes = applyXpGain(progression, pickup.value);
    return { collected: true, type: 'xp', levelsGained: xpRes.levelsGained, hpBefore, hpAfter: player.hp };
  }

  if (pickup.type === 'magnet') {
    return { collected: true, type: 'magnet', levelsGained: 0, hpBefore, hpAfter: player.hp };
  }

  player.hp = clampHealth(player.hp + pickup.value, player.maxHp);
  return { collected: true, type: 'heal', levelsGained: 0, hpBefore, hpAfter: player.hp };
}

export function computeKillDrops(normalKills: number): Array<'heal' | 'magnet'> {
  if (!Number.isInteger(normalKills) || normalKills <= 0) return [];
  const drops: Array<'heal' | 'magnet'> = [];
  if (normalKills % 25 === 0) drops.push('heal');
  if (normalKills % 90 === 0) drops.push('magnet');
  return drops;
}

export function computeEliteDrops(eliteKills: number): Array<'heal' | 'magnet'> {
  if (!Number.isInteger(eliteKills) || eliteKills <= 0) return [];
  return eliteKills % 2 === 0 ? ['heal', 'magnet'] : ['heal'];
}

export function magnetVelocity(
  pickupPos: Vec2,
  playerPos: Vec2,
  magnetRadius: number,
  magnetSpeedPxSec: number
): Vec2 {
  if (!Number.isFinite(magnetRadius) || magnetRadius <= 0 || !Number.isFinite(magnetSpeedPxSec) || magnetSpeedPxSec <= 0) {
    return { x: 0, y: 0 };
  }
  const dist = Math.hypot(playerPos.x - pickupPos.x, playerPos.y - pickupPos.y);
  if (!Number.isFinite(dist) || dist > magnetRadius || dist <= 1e-6) return { x: 0, y: 0 };
  const dir = directionFromTo(pickupPos, playerPos);
  return { x: dir.x * magnetSpeedPxSec, y: dir.y * magnetSpeedPxSec };
}
