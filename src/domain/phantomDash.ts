import { selectNearestTarget } from './targeting';
import { normalized, type Vec2 } from './vector';

export const MAX_PHANTOM_DASH_LEVEL = 5;

export const PHANTOM_DASH = {
  minCooldownMs: 2000,
  durationMs: 225,
  iframeMs: 400,
  statusBonusDamage: 35,
  hitRadiusPx: 56,
  knockbackPxSec: 160,
  overshootPx: 42,
  minDashPx: 72,
} as const;

export type PhantomDashStats = {
  level: number;
  cooldownMs: number;
  damage: number;
  searchRangePx: number;
  maxDashPx: number;
  pierceCount: number;
  dashCount: number;
};

const DASH_LEVELS: ReadonlyArray<Omit<PhantomDashStats, 'level'>> = [
  { cooldownMs: 4500, damage: 65, searchRangePx: 300, maxDashPx: 220, pierceCount: 1, dashCount: 1 },
  { cooldownMs: 3800, damage: 90, searchRangePx: 340, maxDashPx: 280, pierceCount: 2, dashCount: 1 },
  { cooldownMs: 3200, damage: 110, searchRangePx: 380, maxDashPx: 340, pierceCount: 3, dashCount: 2 },
  { cooldownMs: 2800, damage: 140, searchRangePx: 420, maxDashPx: 400, pierceCount: 4, dashCount: 2 },
  { cooldownMs: 2400, damage: 175, searchRangePx: 460, maxDashPx: 460, pierceCount: 4, dashCount: 3 },
];

export type PhantomDashState = {
  readyAtMs: number;
  startedAtMs: number;
  activeUntilMs: number;
  startPos: Vec2;
  endPos: Vec2;
  dir: Vec2;
};

export type DashCandidate = { id: number; x: number; y: number; active: boolean; dead: boolean; bodyEnabled?: boolean; hp?: number };
export type AutoDashPlan = { targetId: number; dir: Vec2; endPos: Vec2 };

export function getPhantomDashStats(level: number): PhantomDashStats {
  const clamped = Math.max(1, Math.min(MAX_PHANTOM_DASH_LEVEL, Math.floor(level)));
  return { level: clamped, ...DASH_LEVELS[clamped - 1]! };
}

export function createPhantomDashState(): PhantomDashState {
  return { readyAtMs: 0, startedAtMs: 0, activeUntilMs: 0, startPos: { x: 0, y: 0 }, endPos: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
}

export function canTriggerPhantomDash(state: PhantomDashState, nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs >= state.readyAtMs && nowMs >= state.activeUntilMs;
}

export function planAutoPhantomDash<T extends DashCandidate>(
  origin: Vec2,
  candidates: readonly T[],
  level: number,
  preferExcludeIds?: ReadonlySet<number>
): AutoDashPlan | null {
  const stats = getPhantomDashStats(level);
  const pool = candidates.map((c) => ({ ...c, bodyEnabled: c.bodyEnabled ?? true, hp: c.hp ?? 1 }));
  const unhit = preferExcludeIds?.size ? pool.filter((c) => !preferExcludeIds.has(c.id)) : pool;
  const target = selectNearestTarget(origin, unhit, stats.searchRangePx) ?? selectNearestTarget(origin, pool, stats.searchRangePx);
  if (!target) return null;

  const distToTarget = Math.hypot(target.x - origin.x, target.y - origin.y);
  const dir = distToTarget > 1e-3 ? normalized({ x: target.x - origin.x, y: target.y - origin.y }) : { x: 1, y: 0 };
  const maxSq = PHANTOM_DASH.hitRadiusPx * PHANTOM_DASH.hitRadiusPx;
  const alongRay = candidates
    .filter((c) => c.active && !c.dead)
    .map((c) => {
      const dx = c.x - origin.x, dy = c.y - origin.y;
      const proj = dx * dir.x + dy * dir.y;
      const perpSq = (dx - proj * dir.x) ** 2 + (dy - proj * dir.y) ** 2;
      return { id: c.id, proj, perpSq };
    })
    .filter((item) => item.proj >= -16 && item.proj <= stats.maxDashPx && item.perpSq <= maxSq)
    .sort((a, b) => a.proj - b.proj || a.id - b.id)
    .slice(0, stats.pierceCount);

  const lastProj = alongRay.length > 0 ? alongRay[alongRay.length - 1]!.proj : distToTarget;
  const dashDist = Math.max(PHANTOM_DASH.minDashPx, Math.min(stats.maxDashPx, lastProj + PHANTOM_DASH.overshootPx));
  return { targetId: target.id, dir, endPos: { x: origin.x + dir.x * dashDist, y: origin.y + dir.y * dashDist } };
}

export function triggerAutoPhantomDash<T extends DashCandidate>(
  state: PhantomDashState,
  origin: Vec2,
  candidates: readonly T[],
  level: number,
  nowMs: number,
  cooldownReductionMs = 0,
  startCooldown = true,
  preferExcludeIds?: ReadonlySet<number>
): PhantomDashState | null {
  if (startCooldown && !canTriggerPhantomDash(state, nowMs)) return null;
  const plan = planAutoPhantomDash(origin, candidates, level, preferExcludeIds);
  if (!plan) return null;

  const stats = getPhantomDashStats(level);
  const cd = Math.max(PHANTOM_DASH.minCooldownMs, stats.cooldownMs - Math.max(0, cooldownReductionMs));
  state.startPos = { x: origin.x, y: origin.y };
  state.dir = plan.dir;
  state.endPos = plan.endPos;
  state.startedAtMs = nowMs;
  state.activeUntilMs = nowMs + PHANTOM_DASH.durationMs;
  if (startCooldown) state.readyAtMs = nowMs + cd;
  return state;
}

export function stepPhantomDashPosition(state: PhantomDashState, nowMs: number): { x: number; y: number; active: boolean } {
  if (nowMs >= state.activeUntilMs || state.activeUntilMs <= state.startedAtMs) {
    return { x: state.endPos.x, y: state.endPos.y, active: false };
  }
  const rawT = Math.max(0, Math.min(1, (nowMs - state.startedAtMs) / (state.activeUntilMs - state.startedAtMs)));
  const t = 1 - (1 - rawT) * (1 - rawT);
  return { x: state.startPos.x + (state.endPos.x - state.startPos.x) * t, y: state.startPos.y + (state.endPos.y - state.startPos.y) * t, active: true };
}

function segmentProjection(p: Vec2, a: Vec2, b: Vec2): { proj: number; distSq: number } {
  const vx = b.x - a.x, vy = b.y - a.y, lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-6) return { proj: 0, distSq: (p.x - a.x) ** 2 + (p.y - a.y) ** 2 };
  const rawProj = ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq;
  const t = Math.max(0, Math.min(1, rawProj));
  return { proj: rawProj, distSq: (p.x - (a.x + t * vx)) ** 2 + (p.y - (a.y + t * vy)) ** 2 };
}

export function findPhantomDashTargets<T extends DashCandidate>(
  startPos: Vec2,
  endPos: Vec2,
  hitRadiusPx: number,
  candidates: readonly T[],
  pierceCount = Number.POSITIVE_INFINITY
): T[] {
  const maxSq = hitRadiusPx * hitRadiusPx;
  const seen = new Set<number>();
  const hits: Array<{ item: T; proj: number }> = [];
  for (const c of candidates) {
    if (!c.active || c.dead || seen.has(c.id)) continue;
    const { proj, distSq } = segmentProjection(c, startPos, endPos);
    if (distSq <= maxSq) { seen.add(c.id); hits.push({ item: c, proj }); }
  }
  hits.sort((a, b) => a.proj - b.proj || a.item.id - b.item.id);
  return hits.slice(0, Math.max(0, pierceCount)).map((h) => h.item);
}
