import { aimDirection, normalized, type Vec2 } from './vector';

export const CLONE_SPAWN_RADIUS_PX = 58;
export const CLONE_STAGGER_MS = 40;
export const CLONE_SWEEP_ARC_COS_MIN = 0.5;
const POINT_BLANK_RADIUS_PX = 16;

export type CloneLevelSpec = {
  level: number;
  count: number;
  damage: number;
  cooldownMs: number;
  triggerRangePx: number;
  hitRadiusPx: number;
  knockbackPxSec: number;
  maxHitsPerClone: number;
};

export type ClonePlan = { spawn: Vec2; dir: Vec2; launchDelayMs: number };

const CLONE_SPECS: ReadonlyArray<CloneLevelSpec> = [
  { level: 1, count: 1, damage: 35, cooldownMs: 2200, triggerRangePx: 140, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2 },
  { level: 2, count: 2, damage: 40, cooldownMs: 2000, triggerRangePx: 160, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2 },
  { level: 3, count: 3, damage: 45, cooldownMs: 1800, triggerRangePx: 160, hitRadiusPx: 48, knockbackPxSec: 180, maxHitsPerClone: 2 },
  { level: 4, count: 4, damage: 50, cooldownMs: 1600, triggerRangePx: 180, hitRadiusPx: 52, knockbackPxSec: 180, maxHitsPerClone: 2 },
  { level: 5, count: 4, damage: 60, cooldownMs: 1400, triggerRangePx: 180, hitRadiusPx: 60, knockbackPxSec: 200, maxHitsPerClone: 2 },
];

export function getCloneLevelSpec(level: number): CloneLevelSpec {
  if (!Number.isInteger(level) || level < 1 || level > CLONE_SPECS.length) {
    throw new Error(`Invalid clone level: ${level}`);
  }
  return CLONE_SPECS[level - 1]!;
}

export function planCloneFormation(playerPos: Vec2, targetPos: Vec2, level: number): ClonePlan[] {
  const { count } = getCloneLevelSpec(level);
  const towardPlayer = aimDirection(targetPos, playerPos, { x: -1, y: 0 });
  const baseAngle = Math.atan2(towardPlayer.y, towardPlayer.x);
  const plans: ClonePlan[] = [];
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (Math.PI * 2 * i) / count;
    const spawn = {
      x: targetPos.x + Math.cos(angle) * CLONE_SPAWN_RADIUS_PX,
      y: targetPos.y + Math.sin(angle) * CLONE_SPAWN_RADIUS_PX,
    };
    plans.push({ spawn, dir: aimDirection(spawn, targetPos), launchDelayMs: i * CLONE_STAGGER_MS });
  }
  return plans;
}

export function isInsideSweepCone(clonePos: Vec2, dir: Vec2, enemyPos: Vec2, hitRadiusPx: number, arcCosMin = CLONE_SWEEP_ARC_COS_MIN): boolean {
  if (!Number.isFinite(hitRadiusPx) || hitRadiusPx <= 0) return false;
  const dx = enemyPos.x - clonePos.x;
  const dy = enemyPos.y - clonePos.y;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist > hitRadiusPx) return false;
  if (dist <= POINT_BLANK_RADIUS_PX) return true;
  const normDir = normalized(dir);
  if (normDir.x === 0 && normDir.y === 0) return false;
  return (dx / dist) * normDir.x + (dy / dist) * normDir.y >= arcCosMin;
}
