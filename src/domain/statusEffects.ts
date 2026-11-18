export const MIN_SLOW_SPEED_PX_SEC = 35;
export const BURN_TICK_INTERVAL_MS = 500;

export type DualWaveKind = 'ice' | 'dark_fire' | 'dual_x';

export type EnemyStatusState = {
  slowReductionPxSec: number;
  slowUntilMs: number;
  slowWasActive: boolean;
  burnDamagePerTick: number;
  burnNextTickMs: number;
  burnUntilMs: number;
  burnWasActive: boolean;
};

export type StatusStepResult = {
  slowActive: boolean;
  slowExpired: boolean;
  burnActive: boolean;
  burnExpired: boolean;
  burnDamage: number;
};

export type DualSlashStatusConfig = {
  slowReductionPxSec: number;
  slowDurationMs: number;
  burnDamagePerTick: number;
  burnDurationMs: number;
};

export function createEnemyStatusState(): EnemyStatusState {
  return {
    slowReductionPxSec: 0,
    slowUntilMs: Number.NEGATIVE_INFINITY,
    slowWasActive: false,
    burnDamagePerTick: 0,
    burnNextTickMs: Number.POSITIVE_INFINITY,
    burnUntilMs: Number.NEGATIVE_INFINITY,
    burnWasActive: false,
  };
}

const SLOW_REDUCTION = [50, 50, 55, 55, 60] as const;
const SLOW_DURATION = [2200, 2300, 2500, 2700, 3000] as const;
const BURN_DAMAGE = [10, 10, 12, 14, 16] as const;
const BURN_DURATION = [2500, 2500, 2500, 2800, 3000] as const;

export function getDualSlashStatusConfig(level: number): DualSlashStatusConfig {
  const step = Math.max(0, Math.min(4, Math.floor(level) - 1));
  return {
    slowReductionPxSec: SLOW_REDUCTION[step]!,
    slowDurationMs: SLOW_DURATION[step]!,
    burnDamagePerTick: BURN_DAMAGE[step]!,
    burnDurationMs: BURN_DURATION[step]!,
  };
}

export function applySlowStatus(status: EnemyStatusState, reductionPxSec: number, durationMs: number, nowMs: number): void {
  if (!Number.isFinite(reductionPxSec) || reductionPxSec <= 0 || durationMs <= 0) return;
  const active = nowMs < status.slowUntilMs;
  status.slowReductionPxSec = active ? Math.max(status.slowReductionPxSec, reductionPxSec) : reductionPxSec;
  status.slowUntilMs = Math.max(status.slowUntilMs, nowMs + durationMs);
  status.slowWasActive = true;
}

export function applyBurnStatus(status: EnemyStatusState, damagePerTick: number, durationMs: number, nowMs: number): void {
  if (!Number.isFinite(damagePerTick) || damagePerTick <= 0 || durationMs <= 0) return;
  const alreadyBurning = nowMs < status.burnUntilMs;
  status.burnDamagePerTick = alreadyBurning ? Math.max(status.burnDamagePerTick, damagePerTick) : damagePerTick;
  if (!alreadyBurning) status.burnNextTickMs = nowMs + BURN_TICK_INTERVAL_MS;
  status.burnUntilMs = Math.max(status.burnUntilMs, nowMs + durationMs);
  status.burnWasActive = true;
}

export function computeEffectiveEnemySpeed(baseSpeed: number, status: EnemyStatusState, nowMs: number): number {
  if (nowMs >= status.slowUntilMs || status.slowReductionPxSec <= 0) return baseSpeed;
  if (baseSpeed <= 0) return baseSpeed;
  return Math.max(Math.min(baseSpeed, MIN_SLOW_SPEED_PX_SEC), baseSpeed - status.slowReductionPxSec);
}

export function stepEnemyStatus(status: EnemyStatusState, nowMs: number): StatusStepResult {
  const slowActive = nowMs < status.slowUntilMs;
  const slowExpired = status.slowWasActive && !slowActive;
  if (slowExpired) {
    status.slowWasActive = false;
    status.slowReductionPxSec = 0;
  }

  const burnActive = nowMs < status.burnUntilMs;
  let burnDamage = 0;
  if (burnActive && nowMs >= status.burnNextTickMs) {
    burnDamage = status.burnDamagePerTick;
    while (status.burnNextTickMs <= nowMs) status.burnNextTickMs += BURN_TICK_INTERVAL_MS;
  }
  const burnExpired = status.burnWasActive && !burnActive;
  if (burnExpired) {
    status.burnWasActive = false;
    status.burnDamagePerTick = 0;
    status.burnNextTickMs = Number.POSITIVE_INFINITY;
  }

  return { slowActive, slowExpired, burnActive, burnExpired, burnDamage };
}
