import { clampHealth, type PlayerState } from './combat';
import { applyXpGain, type RunProgression } from './progression';

export type PickupType = 'xp' | 'heal';

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
  return {
    id,
    type,
    value,
    state: 'ground',
    x,
    y,
  };
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
  if (
    !player.alive ||
    pickup.state !== 'ground' ||
    !Number.isFinite(pickup.value) ||
    pickup.value <= 0
  ) {
    return { collected: false, levelsGained: 0, hpBefore, hpAfter: hpBefore };
  }

  pickup.state = 'collected';

  if (pickup.type === 'xp') {
    const xpRes = applyXpGain(progression, pickup.value);
    return {
      collected: true,
      type: 'xp',
      levelsGained: xpRes.levelsGained,
      hpBefore,
      hpAfter: player.hp,
    };
  }

  player.hp = clampHealth(player.hp + pickup.value, player.maxHp);
  return {
    collected: true,
    type: 'heal',
    levelsGained: 0,
    hpBefore,
    hpAfter: player.hp,
  };
}
