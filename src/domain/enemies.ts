import { aimDirection, chaseVelocity, type Vec2 } from './vector';

export type EnemyArchetypeId = 'slime' | 'shade' | 'mage' | 'boss';
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
  preferredRangePx?: number;
  attackCooldownMs?: number;
  telegraphMs?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
  barrageCount?: number;
};

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetypeConfig> = {
  slime: {
    id: 'slime', maxHp: 50, speed: 94, touchDamage: 11, xpValue: 1,
    texture: 'enemy', anim: 'enemy-walk', radius: 8,
  },
  shade: {
    id: 'shade', maxHp: 32, speed: 155, touchDamage: 9, xpValue: 2,
    texture: 'enemy_shade', anim: 'enemy-shade-walk', radius: 8,
  },
  mage: {
    id: 'mage', maxHp: 42, speed: 78, touchDamage: 10, xpValue: 3,
    texture: 'enemy_mage', anim: 'enemy-mage-walk', radius: 8,
    preferredRangePx: 230, attackCooldownMs: 2400, telegraphMs: 550,
    projectileSpeed: 280, projectileDamage: 12,
  },
  boss: {
    id: 'boss', maxHp: 900, speed: 86, touchDamage: 20, xpValue: 25,
    texture: 'boss', anim: 'boss-walk', radius: 16,
    attackCooldownMs: 3200, telegraphMs: 700, projectileSpeed: 260,
    projectileDamage: 15, barrageCount: 8,
  },
};

export type RangedAttackState = {
  phase: EnemyAiPhase;
  nextAttackAtMs: number;
  telegraphEndsAtMs: number;
};

export type RangedStepResult = {
  phase: EnemyAiPhase;
  telegraphing: boolean;
  shouldFire: boolean;
  projectileDirections: Vec2[];
};

export function createRangedAttackState(nowMs = 0, initialDelayMs = 450): RangedAttackState {
  return {
    phase: 'chase',
    nextAttackAtMs: nowMs + initialDelayMs,
    telegraphEndsAtMs: Number.NEGATIVE_INFINITY,
  };
}

export function computeArchetypeVelocity(
  archetype: EnemyArchetypeId,
  enemyPos: Vec2,
  playerPos: Vec2,
  playerDead = false,
  telegraphing = false
): Vec2 {
  if (playerDead || telegraphing) return { x: 0, y: 0 };
  const cfg = ENEMY_ARCHETYPES[archetype];
  if (cfg.preferredRangePx !== undefined) {
    const dist = Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
    if (dist > cfg.preferredRangePx) return chaseVelocity(enemyPos, playerPos, cfg.speed, false);
    if (dist < cfg.preferredRangePx * 0.55) return chaseVelocity(playerPos, enemyPos, cfg.speed * 0.5, false);
    return { x: 0, y: 0 };
  }
  return chaseVelocity(enemyPos, playerPos, cfg.speed, false);
}

export function stepRangedAttackState(
  archetype: EnemyArchetypeId,
  state: RangedAttackState,
  enemyPos: Vec2,
  playerPos: Vec2,
  nowMs: number
): RangedStepResult {
  const cfg = ENEMY_ARCHETYPES[archetype];
  if (!cfg.attackCooldownMs || !cfg.telegraphMs) {
    state.phase = 'chase';
    return { phase: 'chase', telegraphing: false, shouldFire: false, projectileDirections: [] };
  }

  const dist = Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y);
  const maxAttackRange = cfg.preferredRangePx ? cfg.preferredRangePx * 1.8 : 520;

  if (state.phase === 'chase') {
    if (nowMs >= state.nextAttackAtMs && dist <= maxAttackRange) {
      state.phase = 'telegraph';
      state.telegraphEndsAtMs = nowMs + cfg.telegraphMs;
      return { phase: 'telegraph', telegraphing: true, shouldFire: false, projectileDirections: [] };
    }
    return { phase: 'chase', telegraphing: false, shouldFire: false, projectileDirections: [] };
  }

  if (nowMs < state.telegraphEndsAtMs) {
    return { phase: 'telegraph', telegraphing: true, shouldFire: false, projectileDirections: [] };
  }

  state.phase = 'chase';
  state.nextAttackAtMs = nowMs + cfg.attackCooldownMs;
  const baseDir = aimDirection(enemyPos, playerPos);
  const count = cfg.barrageCount ?? 1;
  if (count <= 1) {
    return { phase: 'barrage', telegraphing: false, shouldFire: true, projectileDirections: [baseDir] };
  }

  const baseAngle = Math.atan2(baseDir.y, baseDir.x);
  const dirs: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / count;
    dirs.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return { phase: 'barrage', telegraphing: false, shouldFire: true, projectileDirections: dirs };
}
