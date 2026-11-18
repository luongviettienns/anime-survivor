import { expect, test } from 'vitest';
import { hudLayout, upgradeLayout } from '../src/ui/layout';

test('HUD anchors to both edges and the current screen center', () => {
  for (const [w,h] of [[1280,720],[960,540],[1920,1080]] as const) {
    const layout = hudLayout(w,h);
    expect(layout.center).toBe(w/2);
    expect(layout.right).toBe(w-16);
    expect(layout.xp.x+layout.xp.w).toBeLessThan(layout.levelX-40);
    expect(layout.boss.x+layout.boss.w/2).toBe(w/2);
    expect(layout.boss.y).toBe(h-48);
    expect(layout.hp.x+layout.hp.w).toBeLessThan(w/2-64);
  }
});
test('three upgrade cards fit with equal spacing around the screen center', () => {
  for (const [w,h] of [[1280,720],[960,540]] as const) {
    const layout = upgradeLayout(w,h);
    expect(layout.centers[1]).toBe(w/2);
    expect(layout.centers[0]-layout.cardW/2).toBeGreaterThanOrEqual(24);
    expect(layout.centers[2]+layout.cardW/2).toBeLessThanOrEqual(w-24);
    expect(layout.cardY+layout.cardH/2).toBeLessThanOrEqual(h-24);
    expect(layout.cardY-layout.cardH/2).toBeGreaterThan(layout.bannerY+36);
  }
});
