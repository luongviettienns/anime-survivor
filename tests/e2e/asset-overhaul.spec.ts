import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { WeaponInventory } from '../../src/domain/weapons';

test('high-resolution Rasengan and empty-handed actor are applied without sword effects', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as { weapon: { inventory: WeaponInventory }; spawnTimer: Phaser.Time.TimerEvent };
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 1, clone: 0, orbital: 0, mine: 0 });
    const position = api.getPlayerPosition(); api.spawnEnemyAt(position.x + 260, position.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getCounts().projectiles > 0);
  const orb = await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as {
      weapon: { projectiles: Phaser.Physics.Arcade.Group };
    };
    const shot = scene.weapon.projectiles.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
    return { texture: shot.texture.key, display: shot.displayWidth, bodyWidth: shot.body!.width, animation: shot.anims.currentAnim?.key };
  });
  expect(orb).toMatchObject({ texture: 'rasengan', display: 96, animation: 'rasengan-spin' });
  expect(orb.bodyWidth).toBeCloseTo(21);
  await page.screenshot({ path: 'test-results/rasengan-new-flight.png' });
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as { weapon: { inventory: WeaponInventory } };
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 5, orbital: 0, mine: 0 });
    api.clearEnemies(); const p = api.getPlayerPosition(); api.spawnEnemyAt(p.x + 60, p.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some((child) => {
    const sprite = child as Phaser.GameObjects.Sprite;
    return sprite.visible && sprite.texture?.key === 'hero_actions' && sprite.anims.currentAnim?.key === 'naruto-action-clone';
  }), undefined, { polling: 'raf' });
  const forbidden = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some((child) => {
    const sprite = child as Phaser.GameObjects.Sprite;
    return sprite.visible && ['kunai', 'slash', 'slash_x'].includes(sprite.texture?.key ?? '');
  }));
  expect(forbidden).toBe(false);
  await page.screenshot({ path: 'test-results/naruto-empty-hand-punch.png' });
  expect(errors).toEqual([]);
});

test('evolution and ground shockwave artwork preview loads without enabling gameplay', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/art-preview.html');
  await page.waitForFunction(() => '__ART_REVIEW_READY__' in window);
  await expect(page.locator('article')).toHaveCount(32);
  await expect(page.locator('#status')).toContainText('chưa kích hoạt');
  await page.screenshot({ path: 'test-results/asset-review.png', fullPage: true });
  expect(errors).toEqual([]);
});
