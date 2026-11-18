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

export function getDualSlashStatusConfig(level: number): DualSlashStatusConfig {
  const clamped = Math.max(1, Math.min(5, Math.floor(level)));
  return {
    slowReductionPxSec: clamped >= 5 ? 60 : clamped >= 3 ? 55 : 50,
    slowDurationMs: clamped >= 5 ? 3000 : clamped >= 3 ? 2500 : 2200,
    burnDamagePerTick: clamped >= 5 ? 16 : clamped >= 4 ? 14 : 12,
    burnDurationMs: clamped >= 5 ? 3000 : 2500,
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
