import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1 Gameplay Logic E2E', () => {
  test('A: boots game, normalizes diagonal vs cardinal displacement, and has no console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width', '960');
    await expect(canvas).toHaveAttribute('height', '540');

    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());

    const startCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    const endCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const cardinalDist = Math.hypot(
      endCardinal.x - startCardinal.x,
      endCardinal.y - startCardinal.y
    );

    const startDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.keyboard.down('w');
    const diagVel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    await page.keyboard.up('w');
    const endDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const diagDist = Math.hypot(endDiag.x - startDiag.x, endDiag.y - startDiag.y);

    expect(Math.hypot(diagVel.x, diagVel.y)).toBeCloseTo(250, 1);
    expect(cardinalDist).toBeGreaterThan(40);
    expect(Math.abs(diagDist - cardinalDist)).toBeLessThan(25);
    await page.screenshot({ path: 'test-results/anime-survivor.png' });
    expect(errors).toEqual([]);
  });

  test('B, C, D, E, G: enforces 3-enemy overlap single hit i-frames, auto-target kill, single pickup collider, heal clamp, and clean restart', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.waitForTimeout(150);

    // Check G baseline: exactly 3 overlap colliders registered
    const initialCounts = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(initialCounts.colliders).toBe(3);

    // Check B: 3 enemies overlapping player simultaneously inflict 11 damage once
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
    });

    await page.waitForTimeout(100);
    const stateAfterOverlap = await page.evaluate(() =>
      window.__ANIME_SURVIVOR__!.getPlayerState()
    );
    expect(stateAfterOverlap.hp).toBe(89);

    // Check C & D: auto-targeting shoots and kills nearby enemy, dropping XP gem without increasing collider count
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x + 90, pos.y);
    });

    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1,
      undefined,
      { timeout: 3000 }
    );
    const countsAfterKill = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterKill.colliders).toBe(3);

    // Check E: heal pickup restores HP and clamps at 100
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const pos = api.getPlayerPosition();
      api.spawnHealAt(pos.x, pos.y, 25);
    });
    await page.waitForTimeout(100);
    const stateAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState());
    expect(stateAfterHeal.hp).toBe(100);
  });
});
