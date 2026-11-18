import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { EnemySystem } from '../../src/game/systems/EnemySystem';
import type { WeaponInventory } from '../../src/domain/weapons';

test('new enemy sizes, shared red aura and cast poses follow real AI states', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      enemies: EnemySystem; weapon: { inventory: WeaponInventory }; spawnTimer: Phaser.Time.TimerEvent;
    };
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, slash: 0, orbital: 0, mine: 0 });
    const p = api.getPlayerPosition();
    const regular = scene.enemies.spawnAt(p.x - 200, p.y, 'slime');
    const mage = scene.enemies.spawnAt(p.x + 220, p.y, 'mage');
    const boss = scene.enemies.spawnAt(p.x, p.y - 180, 'boss');
    return [regular, mage, boss].length;
  });
  await page.waitForTimeout(50);
  const sizes = await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as { enemies: EnemySystem };
    return scene.enemies.group.getChildren().map((object) => {
      const sprite = object as Phaser.Physics.Arcade.Sprite;
      return { canvas: sprite.width, source: sprite.frame.source.width, body: sprite.body!.width };
    });
  });
  expect(sizes).toHaveLength(3);
  for (let index = 0; index < sizes.length; index++) {
    expect(sizes[index]!.canvas).toBe(256);
    expect(sizes[index]!.source).toBeGreaterThanOrEqual(128);
    expect(sizes[index]!.body).toBeCloseTo(index === 2 ? 64 : 32);
  }
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some((child) => {
    const sprite = child as Phaser.GameObjects.Sprite;
    return sprite.active && sprite.texture?.key === 'boss' && String(sprite.frame.name) === '4';
  }));
  await page.screenshot({ path: 'test-results/enemy-dark-charge.png' });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some((child) => {
    const sprite = child as Phaser.GameObjects.Sprite;
    return sprite.active && sprite.texture?.key === 'boss' && String(sprite.frame.name) === '5';
  }));
  const layers = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list
    .filter((child) => (child as Phaser.GameObjects.Sprite).texture?.key?.startsWith('aura_'))
    .map((child) => ({ visible: (child as Phaser.GameObjects.Sprite).visible, tint: (child as Phaser.GameObjects.Sprite).tintTopLeft })));
  expect(layers).toHaveLength(4);
  expect(layers.every((layer) => layer.visible && layer.tint === 0xff344c)).toBe(true);
  await page.screenshot({ path: 'test-results/enemy-dark-release.png' });
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());
  const count = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list
    .filter((child) => (child as Phaser.GameObjects.Sprite).texture?.key?.startsWith('aura_')).length);
  expect(count).toBe(0);
  expect(errors).toEqual([]);
});
