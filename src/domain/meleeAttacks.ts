import type { EnemyArchetypeId } from './enemies';
import { aimDirection, type Vec2 } from './vector';

export const MELEE = {
  slime: { range: 68, windup: 400, active: 140, recovery: 360, cooldown: 1800, radius: 72, damage: 16, speed: 0 },
  shade: { range: 130, windup: 450, active: 220, recovery: 330, cooldown: 2200, radius: 38, damage: 14, speed: 460 },
  boss: {
    range: 135, windup: 600, enragedWindup: 480, active: 180, recovery: 400,
    cooldown: 3600, enragedCooldown: 2600, radius: 135, coneCos: Math.cos((150 * Math.PI) / 360),
    damage: 42, enragedDamage: 52, speed: 0,
  },
} as const;

export type MeleePhase = 'chase' | 'windup' | 'active' | 'recover';
export type MeleeAttack = { phase: MeleePhase; started: number; readyAt: number; aim: Vec2; hit: boolean };
export const createMeleeAttack = (): MeleeAttack => ({ phase: 'chase', started: 0, readyAt: 0, aim: { x: 1, y: 0 }, hit: false });

export function stepMeleeAttack(
  archetype: EnemyArchetypeId,
  state: MeleeAttack,
  enemy: Vec2,
  player: Vec2,
  now: number,
  interrupted = false,
  enraged = false,
  elapsedSec = 0
): { phase: MeleePhase; hit: boolean; impact: boolean; velocity: Vec2; elapsed: number; damage: number } {
  const result = { phase: 'chase' as MeleePhase, hit: false, impact: false, velocity: { x: 0, y: 0 }, elapsed: 0, damage: 0 };
  if (archetype !== 'slime' && archetype !== 'shade' && archetype !== 'boss') return result;

  const cfg = MELEE[archetype];
  const windup = archetype === 'boss' && enraged ? MELEE.boss.enragedWindup : cfg.windup;
  const cooldown = archetype === 'boss' && enraged ? MELEE.boss.enragedCooldown : cfg.cooldown;
  const minutes = Math.max(0, Math.floor(Number.isFinite(elapsedSec) ? elapsedSec / 60 : 0));
  const damage = archetype === 'boss' ? (enraged ? MELEE.boss.enragedDamage : MELEE.boss.damage) : cfg.damage + minutes * 3;
  result.damage = damage;

  if (interrupted) {
    state.phase = 'chase';
    state.readyAt = Math.max(state.readyAt, now + cooldown);
    return result;
  }

  const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (state.phase === 'chase') {
    if (now < state.readyAt || distance > cfg.range) return result;
    state.phase = 'windup';
    state.started = now;
    state.hit = false;
    state.aim = aimDirection(enemy, player);
    state.readyAt = now + cooldown;
  }

  const elapsed = now - state.started;
  const previous = state.phase;
  state.phase = elapsed < windup ? 'windup' : elapsed < windup + cfg.active ? 'active' :
    elapsed < windup + cfg.active + cfg.recovery ? 'recover' : 'chase';
  result.phase = state.phase;
  result.elapsed = elapsed;

  if (state.phase === 'active') {
    result.impact = previous === 'windup';
    result.velocity = { x: state.aim.x * cfg.speed, y: state.aim.y * cfg.speed };
    if (!state.hit && (archetype === 'shade' || result.impact)) {
      let inHitZone = distance <= cfg.radius;
      if (inHitZone && archetype === 'boss' && distance > 1e-3) {
        const dot = ((player.x - enemy.x) * state.aim.x + (player.y - enemy.y) * state.aim.y) / distance;
        inHitZone = dot >= MELEE.boss.coneCos;
      }
      result.hit = inHitZone;
      if (result.hit || archetype !== 'shade') state.hit = true;
    }
  }
  return result;
}
