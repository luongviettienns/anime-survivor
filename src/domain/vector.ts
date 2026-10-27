export type Vec2 = { x: number; y: number };

const EPSILON = 1e-6;

export function normalized(v: Vec2): Vec2 {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) {
    return { x: 0, y: 0 };
  }
  const len = Math.hypot(v.x, v.y);
  return len <= EPSILON ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

export function directionFromTo(from: Vec2, to: Vec2): Vec2 {
  return normalized({ x: to.x - from.x, y: to.y - from.y });
}

export function aimDirection(from: Vec2, to: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const dir = directionFromTo(from, to);
  if (dir.x !== 0 || dir.y !== 0) {
    return dir;
  }
  const safeFallback = normalized(fallback);
  return safeFallback.x === 0 && safeFallback.y === 0 ? { x: 1, y: 0 } : safeFallback;
}

export function movementVelocity(input: Vec2, speedPxSec: number): Vec2 {
  if (!Number.isFinite(speedPxSec) || speedPxSec <= 0) {
    return { x: 0, y: 0 };
  }
  const dir = normalized(input);
  return {
    x: dir.x === 0 ? 0 : dir.x * speedPxSec,
    y: dir.y === 0 ? 0 : dir.y * speedPxSec,
  };
}

export function chaseVelocity(
  enemyPos: Vec2,
  playerPos: Vec2,
  speedPxSec: number,
  playerDead = false
): Vec2 {
  if (playerDead || !Number.isFinite(speedPxSec) || speedPxSec <= 0) {
    return { x: 0, y: 0 };
  }
  const dir = directionFromTo(enemyPos, playerPos);
  return {
    x: dir.x === 0 ? 0 : dir.x * speedPxSec,
    y: dir.y === 0 ? 0 : dir.y * speedPxSec,
  };
}
