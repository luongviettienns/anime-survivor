export type Vector = { x: number; y: number };
export function unitDirection(from: Vector, to: Vector): Vector {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  return distance === 0 ? { x: 1, y: 0 } : { x: dx / distance, y: dy / distance };
}
export function clampHealth(health: number, maxHealth: number): number {
  return Math.max(0, Math.min(maxHealth, health));
}
