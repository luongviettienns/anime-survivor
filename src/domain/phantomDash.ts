import { normalized, type Vec2 } from './vector';

export const PHANTOM_DASH = {
  cooldownMs: 8000,
  minCooldownMs: 3500,
  distancePx: 220,
  durationMs: 180,
  iframeMs: 500,
  damage: 55,
  statusBonusDamage: 15,
  hitRadiusPx: 56,
  knockbackPxSec: 160,
} as const;

export type PhantomDashState = {
  readyAtMs: number;
  startedAtMs: number;
  activeUntilMs: number;
  startPos: Vec2;
  endPos: Vec2;
  dir: Vec2;
};

export type DashCandidate = {
  id: number;
  x: number;
  y: number;
  active: boolean;
  dead: boolean;
};

export function createPhantomDashState(): PhantomDashState {
  return {
    readyAtMs: 0,
    startedAtMs: 0,
    activeUntilMs: 0,
    startPos: { x: 0, y: 0 },
    endPos: { x: 0, y: 0 },
    dir: { x: 1, y: 0 },
  };
}

export function canTriggerPhantomDash(state: PhantomDashState, nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs >= state.readyAtMs && nowMs >= state.activeUntilMs;
}

export function triggerPhantomDash(
  state: PhantomDashState,
  origin: Vec2,
  moveDir: Vec2,
  lastAim: Vec2,
  nowMs: number,
  cooldownReductionMs = 0
): PhantomDashState | null {
  if (!canTriggerPhantomDash(state, nowMs)) return null;
  const hasMove = Math.hypot(moveDir.x, moveDir.y) > 1e-3;
  const hasAim = Math.hypot(lastAim.x, lastAim.y) > 1e-3;
  const dir = hasMove ? normalized(moveDir) : hasAim ? normalized(lastAim) : { x: 1, y: 0 };
  const cd = Math.max(PHANTOM_DASH.minCooldownMs, PHANTOM_DASH.cooldownMs - Math.max(0, cooldownReductionMs));

  state.startPos = { x: origin.x, y: origin.y };
  state.dir = dir;
  state.endPos = {
    x: origin.x + dir.x * PHANTOM_DASH.distancePx,
    y: origin.y + dir.y * PHANTOM_DASH.distancePx,
  };
  state.startedAtMs = nowMs;
  state.activeUntilMs = nowMs + PHANTOM_DASH.durationMs;
  state.readyAtMs = nowMs + cd;
  return state;
}

export function stepPhantomDashPosition(
  state: PhantomDashState,
  nowMs: number
): { x: number; y: number; active: boolean } {
  if (nowMs >= state.activeUntilMs || state.activeUntilMs <= state.startedAtMs) {
    return { x: state.endPos.x, y: state.endPos.y, active: false };
  }
  const rawT = Math.max(0, Math.min(1, (nowMs - state.startedAtMs) / (state.activeUntilMs - state.startedAtMs)));
  // Ease-out quadratic curve for snappy dash burst
  const t = 1 - (1 - rawT) * (1 - rawT);
  return {
    x: state.startPos.x + (state.endPos.x - state.startPos.x) * t,
    y: state.startPos.y + (state.endPos.y - state.startPos.y) * t,
    active: true,
  };
}

function pointToSegmentDistSq(p: Vec2, a: Vec2, b: Vec2): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-6) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq));
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  return (p.x - projX) ** 2 + (p.y - projY) ** 2;
}

export function findPhantomDashTargets<T extends DashCandidate>(
  startPos: Vec2,
  endPos: Vec2,
  hitRadiusPx: number,
  candidates: readonly T[]
): T[] {
  const maxSq = hitRadiusPx * hitRadiusPx;
  const seen = new Set<number>();
  const hits: T[] = [];
  for (const c of candidates) {
    if (!c.active || c.dead || seen.has(c.id)) continue;
    if (pointToSegmentDistSq(c, startPos, endPos) <= maxSq) {
      seen.add(c.id);
      hits.push(c);
    }
  }
  return hits;
}
