import { aimDirection, chaseVelocity, type Vec2 } from './vector';

export type EnemyArchetypeId = 'slime' | 'shade' | 'mage' | 'elite' | 'boss';
export type EnemyAiPhase = 'chase' | 'telegraph' | 'barrage';

export type EnemyArchetypeConfig = {
  id: EnemyArchetypeId;
  maxHp: number;
  speed: number;
  touchDamage: number;
  xpValue: number;
  texture: string;
  anim: string;
  radius: number;
  knockbackFactor?: number;
  preferredRangePx?: number;
  attackCooldownMs?: number;
  telegraphMs?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
  barrageCount?: number;
};

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetypeConfig> = {
  slime: {
    id: 'slime', maxHp: 50, speed: 94, touchDamage: 10, xpValue: 1,
    texture: 'enemy', anim: 'enemy-walk', radius: 8,
  },
  shade: {
    id: 'shade', maxHp: 35, speed: 155, touchDamage: 9, xpValue: 2,
    texture: 'enemy_shade', anim: 'enemy-shade-walk', radius: 8,
  },
  mage: {
    id: 'mage', maxHp: 45, speed: 78, touchDamage: 10, xpValue: 3,
    texture: 'enemy_mage', anim: 'enemy-mage-walk', radius: 8,
    preferredRangePx: 230, attackCooldownMs: 2400, telegraphMs: 550,
    projectileSpeed: 280, projectileDamage: 12,
  },
  elite: {
    id: 'elite', maxHp: 280, speed: 108, touchDamage: 20, xpValue: 15,
    texture: 'enemy_elite', anim: 'enemy-elite-walk', radius: 12, knockbackFactor: 0.5,
  },
  boss: {
    id: 'boss', maxHp: 4500, speed: 86, touchDamage: 35, xpValue: 25,
    texture: 'boss', anim: 'boss-walk', radius: 16, knockbackFactor: 0,
    attackCooldownMs: 3200, telegraphMs: 700, projectileSpeed: 260,
    projectileDamage: 24, barrageCount: 8,
  },
};

const MINUTE_SCALING: Record<Exclude<EnemyArchetypeId, 'boss'>, { hp: number; dmg: number; projDmg: number; speed: number; lateXp: number }> = {
  slime: { hp: 24, dmg: 3, projDmg: 0, speed: 5, lateXp: 3 },
  shade: { hp: 16, dmg: 3, projDmg: 0, speed: 6, lateXp: 3 },
  mage: { hp: 20, dmg: 0, projDmg: 4, speed: 2, lateXp: 5 },
  elite: { hp: 95, dmg: 4, projDmg: 0, speed: 4, lateXp: 25 },
};

export function scaleEnemyConfig(archetype: EnemyArchetypeId, elapsedSec = 0): EnemyArchetypeConfig {
  const base = ENEMY_ARCHETYPES[archetype];
  if (archetype === 'boss') return { ...base };
  const safeSec = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
  const minutes = Math.floor(safeSec / 60);
  const growth = MINUTE_SCALING[archetype];
  return {
    ...base,
    maxHp: base.maxHp + growth.hp * minutes,
    speed: base.speed + growth.speed * minutes,
    touchDamage: base.touchDamage + growth.dmg * minutes,
    xpValue: safeSec >= 240 ? growth.lateXp : base.xpValue,
    projectileDamage: base.projectileDamage !== undefined ? base.projectileDamage + growth.projDmg * minutes : undefined,
  };
}

export type RangedAttackState = {
  phase: EnemyAiPhase;
  nextAttackAtMs: number;
  telegraphEndsAtMs: number;
  barrageIndex?: number;
};

export type RangedStepResult = {
  phase: EnemyAiPhase;
  telegraphing: boolean;
  shouldFire: boolean;
  enraged: boolean;
  projectileDirections: Vec2[];
};

export function createRangedAttackState(nowMs = 0, initialDelayMs = 450): RangedAttackState {
  return {
    phase: 'chase',
    nextAttackAtMs: nowMs + initialDelayMs,
    telegraphEndsAtMs: Number.NEGATIVE_INFINITY,
    barrageIndex: 0,
  };
}

export function isBossEnraged(archetype: EnemyArchetypeId, hpRatio = 1): boolean {
  return archetype === 'boss' && Number.isFinite(hpRatio) && hpRatio <= 0.5;
}

export function computeArchetypeVelocity(
  archetype: EnemyArchetypeId,
  enemyPos: Vec2,
  playerPos: Vec2,
  playerDead = false,
  telegraphing = false,
  hpRatio = 1
): Vec2 {
  if (playerDead || telegraphing) return { x: 0, y: 0 };
  const cfg = ENEMY_ARCHETYPES[archetype];
  const speed = isBossEnraged(archetype, hpRatio) ? cfg.speed * 1.25 : cfg.speed;
  if (cfg.preferredRangePx !== undefined) {
    const dist = Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
    if (dist > cfg.preferredRangePx) return chaseVelocity(enemyPos, playerPos, speed, false);
    if (dist < cfg.preferredRangePx * 0.55) return chaseVelocity(playerPos, enemyPos, speed * 0.5, false);
    return { x: 0, y: 0 };
  }
  return chaseVelocity(enemyPos, playerPos, speed, false);
}

export function stepRangedAttackState(
  archetype: EnemyArchetypeId,
  state: RangedAttackState,
  enemyPos: Vec2,
  playerPos: Vec2,
  nowMs: number,
  hpRatio = 1
): RangedStepResult {
  const cfg = ENEMY_ARCHETYPES[archetype];
  const enraged = isBossEnraged(archetype, hpRatio);
  if (!cfg.attackCooldownMs || !cfg.telegraphMs) {
    state.phase = 'chase';
    return { phase: 'chase', telegraphing: false, shouldFire: false, enraged, projectileDirections: [] };
  }

  const dist = Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
  const maxAttackRange = cfg.preferredRangePx ? cfg.preferredRangePx * 1.8 : 560;

  if (state.phase === 'chase') {
    if (nowMs >= state.nextAttackAtMs && dist <= maxAttackRange) {
      state.phase = 'telegraph';
      state.telegraphEndsAtMs = nowMs + (enraged ? Math.round(cfg.telegraphMs * 0.8) : cfg.telegraphMs);
      return { phase: 'telegraph', telegraphing: true, shouldFire: false, enraged, projectileDirections: [] };
    }
    return { phase: 'chase', telegraphing: false, shouldFire: false, enraged, projectileDirections: [] };
  }

  if (nowMs < state.telegraphEndsAtMs) {
    return { phase: 'telegraph', telegraphing: true, shouldFire: false, enraged, projectileDirections: [] };
  }

  state.phase = 'chase';
  const cooldown = enraged ? 2200 : cfg.attackCooldownMs;
  state.nextAttackAtMs = nowMs + cooldown;
  const baseDir = aimDirection(enemyPos, playerPos);
  const count = enraged ? 12 : (cfg.barrageCount ?? 1);
  if (count <= 1) {
    return { phase: 'barrage', telegraphing: false, shouldFire: true, enraged, projectileDirections: [baseDir] };
  }

  const spiralIndex = state.barrageIndex ?? 0;
  state.barrageIndex = spiralIndex + 1;
  const spiralOffset = enraged ? (spiralIndex % 4) * 0.26 : 0;
  const baseAngle = Math.atan2(baseDir.y, baseDir.x) + spiralOffset;
  const dirs: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / count;
    dirs.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return { phase: 'barrage', telegraphing: false, shouldFire: true, enraged, projectileDirections: dirs };
}
