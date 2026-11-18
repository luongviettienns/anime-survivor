import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import { xpThreshold } from '../../src/domain/progression';

test('Kirito upgrades auto Phantom Dash Lv1->2 without ninja weapons; restart resets unlocks', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('/?play=1&hero=kirito');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__?.getPlayerState().alive));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as { spawnTimer: Phaser.Time.TimerEvent };
    scene.spawnTimer.paused = true;
    api.clearEnemies();
  });

  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeapons())).toEqual({
    dual_slash: 1, orb: 0, slash: 0, orbital: 0, mine: 0,
  });

  // Space/Shift no longer triggers manual dash
  const before = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  await page.keyboard.press('Space');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getDashState())).toMatchObject({
    enabled: false, level: 0, dashing: false, cooldownRemainingMs: 0,
  });
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition())).toEqual(before);

  // Level up until Phantom Dash reaches Lv.2; ensure Naruto ninja weapons never appear
  let dashLevelEarned = 0;
  for (let attempt = 0; attempt < 20 && dashLevelEarned < 2; attempt++) {
    const progress = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    await page.evaluate((xp) => window.__ANIME_SURVIVOR__!.grantXp(xp), xpThreshold(progress.level) - progress.xp);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3);
    const choices = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices());
    for (const c of choices) {
      expect(['weapon_orb', 'weapon_slash', 'weapon_orbital', 'weapon_mine']).not.toContain(c.id);
    }
    const dashIndex = choices.findIndex((c) => c.id === 'skill_phantom_dash');
    const index = dashIndex >= 0 ? dashIndex : 0;
    if (dashIndex >= 0) {
      dashLevelEarned += 1;
      await page.screenshot({ path: 'test-results/merged-dash-upgrade.png' });
    }
    await page.keyboard.press(String(index + 1));
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);
  }
  expect(dashLevelEarned).toBe(2);
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getDashState().level === 2);

  // Auto-dash triggers automatically when enemy spawns without pressing Space/Shift
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    api.setWeaponLevel('dual_slash', 0);
    const p = api.getPlayerPosition();
    api.spawnEnemyAt(p.x + 120, p.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getDashState().cooldownRemainingMs > 4000, undefined, { timeout: 3000 });

  // Restart resets Kirito back to Lv.1 dual_slash only & locked Dash
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().scene.restart({ heroId: 'kirito' }));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().level === 1 && !window.__ANIME_SURVIVOR__!.getDashState().enabled);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getDashState().level)).toBe(0);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeapons())).toMatchObject({ dual_slash: 1, slash: 0, orbital: 0, mine: 0 });
  const camera = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().cameras.cameras.map((c) => ({ zoom: c.zoom, name: c.name })));
  expect(camera[0]?.zoom).toBe(1.3);
  expect(camera[1]?.zoom).toBe(1);
  await page.screenshot({ path: 'test-results/merged-kirito-view.png' });
  expect(errors).toEqual([]);
});
