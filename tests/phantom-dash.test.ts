import { describe, expect, it } from 'vitest';
import {
  PHANTOM_DASH,
  canTriggerPhantomDash,
  createPhantomDashState,
  findPhantomDashTargets,
  getPhantomDashStats,
  planAutoPhantomDash,
  stepPhantomDashPosition,
  triggerAutoPhantomDash,
} from '../src/domain/phantomDash';

describe('Kirito Auto Phantom Dash pure domain', () => {
  it('slows travel by20percent without shortening the dash distance', () => {
    expect(PHANTOM_DASH.durationMs).toBe(225);
    expect(180 / PHANTOM_DASH.durationMs).toBeCloseTo(0.8);
  });
  it('scales cooldown, damage, range, pierce (1..4), and chain dashes (1..3) across Lv.1..5', () => {
    const lv1 = getPhantomDashStats(1);
    const lv2 = getPhantomDashStats(2);
    const lv3 = getPhantomDashStats(3);
    const lv4 = getPhantomDashStats(4);
    const lv5 = getPhantomDashStats(5);

    expect(lv1).toMatchObject({ level: 1, cooldownMs: 4500, damage: 65, pierceCount: 1, dashCount: 1 });
    expect(lv2).toMatchObject({ level: 2, cooldownMs: 3800, damage: 90, pierceCount: 2, dashCount: 1 });
    expect(lv3).toMatchObject({ level: 3, cooldownMs: 3200, damage: 110, pierceCount: 3, dashCount: 2 });
    expect(lv4).toMatchObject({ level: 4, cooldownMs: 2800, damage: 140, pierceCount: 4, dashCount: 2 });
    expect(lv5).toMatchObject({ level: 5, cooldownMs: 2400, damage: 175, pierceCount: 4, dashCount: 3 });
    expect(lv5.maxDashPx).toBeGreaterThan(lv1.maxDashPx);
    expect(lv5.searchRangePx).toBeGreaterThan(lv1.searchRangePx);
    expect(PHANTOM_DASH.statusBonusDamage).toBe(35);
  });

  it('auto-targets nearest alive enemy and tunes Lv.1 dash length to cross just past 1 enemy', () => {
    const emptyPlan = planAutoPhantomDash({ x: 0, y: 0 }, [{ id: 1, x: 500, y: 0, active: true, dead: false }], 1);
    expect(emptyPlan).toBeNull();

    const plan = planAutoPhantomDash(
      { x: 0, y: 0 },
      [
        { id: 1, x: 110, y: 0, active: true, dead: false },
        { id: 2, x: 205, y: 0, active: true, dead: false },
      ],
      1
    );
    expect(plan).not.toBeNull();
    // Crosses just past enemy 1 (110 + overshoot) without overshooting into enemy 2 at 205
    expect(plan!.endPos.x).toBe(110 + PHANTOM_DASH.overshootPx);
    expect(plan!.endPos.x).toBeLessThan(205);

    // Lv.4 pierces up to 4 lined-up enemies with longer reach
    const lv4Plan = planAutoPhantomDash(
      { x: 0, y: 0 },
      [
        { id: 1, x: 90, y: 0, active: true, dead: false },
        { id: 2, x: 180, y: 0, active: true, dead: false },
        { id: 3, x: 270, y: 0, active: true, dead: false },
        { id: 4, x: 350, y: 0, active: true, dead: false },
      ],
      4
    );
    expect(lv4Plan!.endPos.x).toBeCloseTo(350 + PHANTOM_DASH.overshootPx, 4);
  });

  it('triggers cooldown only on fresh chain start and interpolates position cleanly', () => {
    const state = createPhantomDashState();
    const candidates = [{ id: 1, x: 120, y: 0, active: true, dead: false }];

    expect(canTriggerPhantomDash(state, 1000)).toBe(true);
    const dash = triggerAutoPhantomDash(state, { x: 0, y: 0 }, candidates, 5, 1000, 2000);
    expect(dash).not.toBeNull();
    // 2400 - 2000 = 400 -> floored at minCooldownMs (2000)
    expect(PHANTOM_DASH.minCooldownMs).toBe(2000);
    expect(state.readyAtMs).toBe(1000 + PHANTOM_DASH.minCooldownMs);
    expect(canTriggerPhantomDash(state, 2000)).toBe(false);

    const mid = stepPhantomDashPosition(state, 1000 + PHANTOM_DASH.durationMs / 2);
    const end = stepPhantomDashPosition(state, 1000 + PHANTOM_DASH.durationMs);
    expect(mid.active).toBe(true);
    expect(mid.x).toBeGreaterThan(80);
    expect(end.active).toBe(false);
    expect(end.x).toBeCloseTo(120 + PHANTOM_DASH.overshootPx, 4);
  });

  it('caps hits along dash segment by pierceCount in nearest-first order and prefers unhit chain targets', () => {
    const candidates = [
      { id: 2, x: 150, y: 0, active: true, dead: false },
      { id: 1, x: 90, y: 10, active: true, dead: false },
      { id: 3, x: 200, y: -15, active: true, dead: false },
      { id: 4, x: 100, y: 90, active: true, dead: false },
      { id: 5, x: 50, y: 0, active: true, dead: true },
    ];

    expect(findPhantomDashTargets({ x: 0, y: 0 }, { x: 240, y: 0 }, 56, candidates, 1).map((h) => h.id)).toEqual([1]);
    expect(findPhantomDashTargets({ x: 0, y: 0 }, { x: 240, y: 0 }, 56, candidates, 2).map((h) => h.id)).toEqual([1, 2]);
    expect(findPhantomDashTargets({ x: 0, y: 0 }, { x: 240, y: 0 }, 56, candidates, 4).map((h) => h.id)).toEqual([1, 2, 3]);

    const chainNext = planAutoPhantomDash(
      { x: 132, y: 0 },
      [
        { id: 1, x: 110, y: 0, active: true, dead: false },
        { id: 2, x: 240, y: 0, active: true, dead: false },
      ],
      3,
      new Set([1])
    );
    expect(chainNext!.targetId).toBe(2);
  });
});
