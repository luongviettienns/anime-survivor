import { describe, expect, it } from 'vitest';
import {
  canTriggerPhantomDash,
  createPhantomDashState,
  findPhantomDashTargets,
  stepPhantomDashPosition,
  triggerPhantomDash,
} from '../src/domain/phantomDash';

describe('Kirito Phantom Dash pure domain', () => {
  it('triggers along normalized moveDir or falls back to lastAim when stationary', () => {
    const state = createPhantomDashState();
    expect(canTriggerPhantomDash(state, 0)).toBe(true);

    const dash1 = triggerPhantomDash(state, { x: 100, y: 200 }, { x: 1, y: 1 }, { x: -1, y: 0 }, 1000, 0);
    expect(dash1).not.toBeNull();
    expect(dash1!.startPos).toEqual({ x: 100, y: 200 });
    expect(Math.hypot(dash1!.endPos.x - 100, dash1!.endPos.y - 200)).toBeCloseTo(220, 4);
    expect(dash1!.endPos.x - 100).toBeCloseTo(dash1!.endPos.y - 200, 4);
    expect(canTriggerPhantomDash(state, 1100)).toBe(false);
    expect(canTriggerPhantomDash(state, 8999)).toBe(false);
    expect(canTriggerPhantomDash(state, 9000)).toBe(true);

    // Stationary fallback to lastAim with cooldown reduction floored at 3500ms
    const dash2 = triggerPhantomDash(state, { x: 500, y: 500 }, { x: 0, y: 0 }, { x: 0, y: -1 }, 9000, 6000);
    expect(dash2!.endPos.x).toBeCloseTo(500, 4);
    expect(dash2!.endPos.y).toBeCloseTo(280, 4);
    expect(state.readyAtMs).toBe(12500);
  });

  it('interpolates dash position monotonically and clamps at endPos', () => {
    const state = createPhantomDashState();
    triggerPhantomDash(state, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }, 1000, 0);

    const start = stepPhantomDashPosition(state, 1000);
    const mid = stepPhantomDashPosition(state, 1090);
    const end = stepPhantomDashPosition(state, 1180);
    const after = stepPhantomDashPosition(state, 1400);

    expect(start).toEqual({ x: 0, y: 0, active: true });
    expect(mid.x).toBeGreaterThan(110);
    expect(mid.x).toBeLessThan(220);
    expect(mid.active).toBe(true);
    expect(end).toEqual({ x: 220, y: 0, active: false });
    expect(after).toEqual({ x: 220, y: 0, active: false });
  });

  it('selects alive active enemies intersecting dash segment once without hitting off-path or dead targets', () => {
    const hits = findPhantomDashTargets(
      { x: 0, y: 0 },
      { x: 220, y: 0 },
      56,
      [
        { id: 1, x: 100, y: 30, active: true, dead: false },
        { id: 2, x: 240, y: 0, active: true, dead: false },
        { id: 3, x: 100, y: 80, active: true, dead: false },
        { id: 4, x: -90, y: 0, active: true, dead: false },
        { id: 5, x: 50, y: 0, active: true, dead: true },
        { id: 6, x: 60, y: 0, active: false, dead: false },
      ]
    );
    expect(hits.map((h) => h.id)).toEqual([1, 2]);
  });
});
