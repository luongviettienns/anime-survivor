import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import { xpThreshold } from '../../src/domain/progression';

test('merged Kirito earns Dash and other skills from real level-up cards; restart locks them again', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?play=1&hero=kirito');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__?.getPlayerState().alive));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as { spawnTimer: Phaser.Time.TimerEvent };
    scene.spawnTimer.paused = true; api.clearEnemies();
  });
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeapons())).toEqual({
    dual_slash: 1, orb: 0, slash: 0, orbital: 0, mine: 0,
  });
  const before = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  await page.keyboard.press('Space'); await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getDashState())).toMatchObject({ enabled: false, dashing: false, cooldownRemainingMs: 0 });
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition())).toEqual(before);
  for (let attempt = 0; attempt < 12; attempt++) {
    const progress = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    await page.evaluate(xp => window.__ANIME_SURVIVOR__!.grantXp(xp), xpThreshold(progress.level) - progress.xp);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3);
    const choices = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices());
    const dashIndex = choices.findIndex(c => c.id === 'skill_phantom_dash');
    const index = dashIndex >= 0 ? dashIndex : choices.findIndex(c => c.category === 'passive');
    expect(index).toBeGreaterThanOrEqual(0);
    if (dashIndex >= 0) await page.screenshot({ path: 'test-results/merged-dash-upgrade.png' });
    await page.keyboard.press(String(index + 1));
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);
    if (dashIndex >= 0) break;
  }
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getDashState().enabled);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(50);
  const start = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  await page.keyboard.down('Space'); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(280); await page.keyboard.up('Space');
  const after = await page.evaluate(() => ({ position: window.__ANIME_SURVIVOR__!.getPlayerPosition(), dash: window.__ANIME_SURVIVOR__!.getDashState() }));
  expect(after.position.x - start.x).toBeGreaterThan(210);
  expect(after.dash.cooldownRemainingMs).toBeGreaterThan(7000);
  for (let attempt = 0; attempt < 12; attempt++) {
    const progress = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    await page.evaluate(xp => window.__ANIME_SURVIVOR__!.grantXp(xp), xpThreshold(progress.level) - progress.xp);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3);
    const choices = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices());
    expect(choices.some(c => c.id === 'skill_phantom_dash')).toBe(false);
    const slashIndex = choices.findIndex(c => c.id === 'weapon_slash');
    const index = slashIndex >= 0 ? slashIndex : choices.findIndex(c => c.category === 'passive');
    expect(index).toBeGreaterThanOrEqual(0);
    await page.keyboard.press(String(index + 1));
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);
    if (slashIndex >= 0) break;
  }
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeapons())).toMatchObject({ slash: 1, orbital: 0, mine: 0 });
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().scene.restart({ heroId: 'kirito' }));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().level === 1 && !window.__ANIME_SURVIVOR__!.getDashState().enabled);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeapons())).toMatchObject({ dual_slash: 1, slash: 0, orbital: 0, mine: 0 });
  const camera = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().cameras.cameras.map(c => ({ zoom: c.zoom, name: c.name })));
  expect(camera[0]?.zoom).toBe(1.3); expect(camera[1]?.zoom).toBe(1);
  await page.screenshot({ path: 'test-results/merged-kirito-view.png' });
  expect(errors).toEqual([]);
});
