import type { Vec2 } from './vector';

export type TargetCandidate = {
  id: number;
  x: number;
  y: number;
  active: boolean;
  bodyEnabled: boolean;
  hp: number;
  dead: boolean;
};

const TIE_EPSILON = 1e-6;

export function selectNearestTarget<T extends TargetCandidate>(
  origin: Vec2,
  candidates: readonly T[],
  range: number
): T | null {
  if (!Number.isFinite(range) || range < 0) {
    return null;
  }
  const maxDistSq = range * range;
  let best: T | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (
      !candidate.active ||
      !candidate.bodyEnabled ||
      candidate.dead ||
      candidate.hp <= 0 ||
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.y)
    ) {
      continue;
    }
    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxDistSq) {
      continue;
    }
    if (
      best === null ||
      distSq < bestDistSq - TIE_EPSILON ||
      (Math.abs(distSq - bestDistSq) <= TIE_EPSILON && candidate.id < best.id)
    ) {
      best = candidate;
      bestDistSq = distSq;
    }
  }

  return best;
}

export type WeaponCooldownState = {
  nextAttackAtMs: number;
  intervalMs: number;
};

export function createWeaponCooldown(intervalMs: number): WeaponCooldownState {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('intervalMs must be > 0');
  }
  return {
    nextAttackAtMs: Number.NEGATIVE_INFINITY,
    intervalMs,
  };
}

export function canWeaponFire(state: WeaponCooldownState, nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs >= state.nextAttackAtMs;
}

export function commitWeaponFire(state: WeaponCooldownState, nowMs: number): void {
  if (!Number.isFinite(nowMs)) {
    throw new Error('nowMs must be finite');
  }
  state.nextAttackAtMs = nowMs + state.intervalMs;
}
