import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { EnemySystem } from '../../src/game/systems/EnemySystem';
import type { PickupSystem } from '../../src/game/systems/PickupSystem';
import type { WeaponInventory } from '../../src/domain/weapons';

type Runtime = Phaser.Scene & { enemies: EnemySystem; pickups: PickupSystem;
  spawnTimer: Phaser.Time.TimerEvent; weapon: { inventory: WeaponInventory } };

test('ground shadow PNGs follow feet and clean destroyed/pooled actors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!, scene = api.getScene() as unknown as Runtime;
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
    const p = api.getPlayerPosition();
    scene.enemies.spawnAt(p.x-150, p.y, 'slime');
    scene.enemies.spawnAt(p.x+200, p.y-120, 'boss');
    scene.pickups.spawnXpGem(p.x+170,p.y+100);
  });
  await page.waitForTimeout(80);
  const shadows = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list
    .filter(o => o.getData('ground-shadow')).map(o => {
      const shadow = o as Phaser.GameObjects.Image;
      const owner = shadow.getData('shadow-owner') as Phaser.Physics.Arcade.Sprite;
      return { texture: shadow.texture.key, kind: owner.texture.key, visible: shadow.visible,
        xError: shadow.x-owner.x, yError: shadow.y-owner.y-(owner.texture.key === 'gem' ? 11 :
          (owner.getData('footOffset') as number | undefined) ?? 28), width: shadow.displayWidth };
    }));
  expect(shadows).toHaveLength(4);
  for (const shadow of shadows) {
    expect(shadow.visible).toBe(true); expect(shadow.xError).toBeCloseTo(0); expect(shadow.yError).toBeCloseTo(0);
    expect(shadow.texture).toBe(shadow.kind === 'gem' ? 'shadow_pickup' : 'shadow_actor');
    expect(shadow.width).toBe(shadow.kind === 'boss' ? 66 : shadow.kind === 'hero' ? 32 : shadow.kind === 'gem' ? 18 : 34);
  }
  await page.screenshot({ path: 'test-results/ground-shadows.png' });
  await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
  expect(await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    return scene.children.list.filter(o => o.getData('ground-shadow')).every(o => {
      const owner = o.getData('shadow-owner') as Phaser.Physics.Arcade.Sprite;
      return !owner.active || Math.abs((o as Phaser.GameObjects.Image).x-owner.x) < 1;
    });
  })).toBe(true);
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!, scene = api.getScene() as unknown as Runtime;
    scene.enemies.group.getChildren().forEach(o => (o as Phaser.Physics.Arcade.Sprite).disableBody(true,true));
  });
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.filter(o => o.getData('ground-shadow'))
    .every(o => (o.getData('shadow-owner') as Phaser.Physics.Arcade.Sprite).active || !(o as Phaser.GameObjects.Image).visible))).toBe(true);
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.filter(o => o.getData('ground-shadow'))
    .every(o => Boolean((o.getData('shadow-owner') as Phaser.Physics.Arcade.Sprite).scene)))).toBe(true);
  expect(errors).toEqual([]);
});
