import { aimDirection, type Vec2 } from './vector';

export type Vector = Vec2;

export function unitDirection(from: Vector, to: Vector): Vector {
  return aimDirection(from, to);
}

export function clampHealth(health: number, maxHealth: number): number {
  if (!Number.isFinite(health) || !Number.isFinite(maxHealth) || maxHealth < 0) {
    throw new Error('invalid health bounds');
  }
  return Math.max(0, Math.min(maxHealth, health));
}

export type PlayerState = {
  hp: number;
  maxHp: number;
  alive: boolean;
  invulnerableUntilMs: number;
};

export function createPlayerState(maxHp: number): PlayerState {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('maxHp must be > 0');
  }
  return {
    hp: maxHp,
    maxHp,
    alive: true,
    invulnerableUntilMs: Number.NEGATIVE_INFINITY,
  };
}

export function isPlayerInvulnerable(state: PlayerState, nowMs: number): boolean {
  return state.alive && Number.isFinite(nowMs) && nowMs < state.invulnerableUntilMs;
}

export function applyContactDamage(
  state: PlayerState,
  amount: number,
  nowMs: number,
  invulnerabilityMs = 800
): boolean {
  if (
    !state.alive ||
    !Number.isFinite(amount) ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(invulnerabilityMs) ||
    amount <= 0 ||
    nowMs < state.invulnerableUntilMs
  ) {
    return false;
  }
  state.hp = clampHealth(state.hp - amount, state.maxHp);
  state.invulnerableUntilMs = nowMs + invulnerabilityMs;
  if (state.hp === 0) {
    state.alive = false;
  }
  return true;
}

export type EnemyState = {
  id: number;
  hp: number;
  maxHp: number;
  speed: number;
  dead: boolean;
};

export function createEnemyState(id: number, maxHp: number, speed: number): EnemyState {
  if (!Number.isInteger(id) || id < 1 || !Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('invalid enemy state parameters');
  }
  return {
    id,
    hp: maxHp,
    maxHp,
    speed,
    dead: false,
  };
}

export function applyProjectileHit(
  enemy: EnemyState,
  damage: number
): { damaged: boolean; killed: boolean } {
  if (enemy.dead || enemy.hp <= 0 || !Number.isFinite(damage) || damage <= 0) {
    return { damaged: false, killed: false };
  }
  enemy.hp = clampHealth(enemy.hp - damage, enemy.maxHp);
  if (enemy.hp === 0) {
    enemy.dead = true;
    return { damaged: true, killed: true };
  }
  return { damaged: true, killed: false };
}
