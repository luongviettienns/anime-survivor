import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { EnemySystem } from '../../src/game/systems/EnemySystem';
import type { WeaponInventory } from '../../src/domain/weapons';
import type { DamageSystem } from '../../src/game/systems/DamageSystem';

type Runtime = Phaser.Scene & { enemies: EnemySystem; weapon: { inventory: WeaponInventory };
  spawnTimer: Phaser.Time.TimerEvent; damage: DamageSystem };

test.beforeEach(async ({ page }) => {
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    api.clearEnemies();
    const scene = api.getScene() as unknown as Runtime;
    scene.spawnTimer.paused = true;
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
  });
});

for (const type of ['slime', 'shade'] as const) {
  for (const [direction, dx, dy] of [['right', -70, 0], ['left', 70, 0], ['up', 0, 70], ['down', 0, -70]] as const) {
  test(`${type} attacks ${direction} and cleans overlays on death`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
      await page.evaluate(({ type, dx, dy }) => {
        const api = window.__ANIME_SURVIVOR__!; api.clearEnemies();
        const scene = api.getScene() as unknown as Runtime;
        scene.damage.state.hp = 100; scene.damage.state.invulnerableUntilMs = Infinity;
        const p = api.getPlayerPosition(); api.spawnEnemyTypeAt(type, p.x + dx, p.y + dy);
      }, { type, dx, dy });
      await page.waitForFunction(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
        return scene.enemies.group.getFirstAlive()?.getData('melee-phase') === 'windup';
      });
      await page.waitForFunction(() => {
        const sprite = window.__ANIME_SURVIVOR__!.getScene().children.list.find(o => o.getData('melee-actor')) as Phaser.GameObjects.Sprite;
        return sprite?.visible && Number(sprite.frame.name) % 4 === 1;
      });
      const pose = await page.evaluate(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene();
        const sprite = scene.children.list.find(o => o.getData('melee-actor')) as Phaser.GameObjects.Sprite;
        return { frame: Number(sprite.frame.name), flip: sprite.flipX, visible: sprite.visible, scale: sprite.scaleX };
      });
      expect(pose.frame).toBe(direction === 'up' ? 9 : direction === 'down' ? 1 : 5);
      expect(pose.flip).toBe(direction === 'left'); expect(pose.visible).toBe(true);
      expect(pose.scale).toBe(0.5);
      await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().scene.pause());
      await page.screenshot({ path: `test-results/${type}-windup-${direction}.png` });
      await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().scene.resume());
      await page.waitForFunction(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
        return scene.enemies.group.getFirstAlive()?.getData('melee-phase') === 'active';
      });
      await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().scene.pause());
      const effect = await page.evaluate(() => {
        const sprite = window.__ANIME_SURVIVOR__!.getScene().children.list.find(o => o.getData('melee-effect')) as Phaser.GameObjects.Sprite;
        return { width: sprite.width, texture: sprite.texture.key, visible: sprite.visible };
      });
      expect(effect).toEqual({ width: 384, texture: type === 'slime' ? 'slam_wave' : 'shade_claw', visible: true });
      await page.screenshot({ path: `test-results/${type}-strike-${direction}.png` });
      await page.evaluate(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
        scene.enemies.damageEnemy(scene.enemies.group.getFirstAlive(), 9999);
        scene.scene.resume();
      });
      expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.filter(o =>
        o.getData('melee-actor') || o.getData('melee-warning') || o.getData('melee-effect') || o.getData('melee-trail')).length)).toBe(0);
    expect(errors).toEqual([]);
  });
  }
}

test('slime hit applies one damage, player VFX and knockback; keyboard can dodge', async ({ page }) => {
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!, p = api.getPlayerPosition();
    api.spawnEnemyTypeAt('slime', p.x - 60, p.y);
  });
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.isPaused())).toBe(true);
  await page.waitForTimeout(600);
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(100);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp < 100);
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(84);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some(o => {
    const sprite = o as Phaser.GameObjects.Sprite;
    return sprite.texture?.key === 'player_skill_hit' && sprite.active && sprite.visible;
  }))).toBe(true);
  const before = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  expect(after.x - before.x).toBeGreaterThan(8);
  await page.waitForTimeout(160);
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(84);
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!; api.clearEnemies();
    const p = api.getPlayerPosition(); api.spawnEnemyTypeAt('slime', p.x - 60, p.y);
  });
  await page.keyboard.down('d'); await page.waitForTimeout(600); await page.keyboard.up('d');
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(84);
  await page.screenshot({ path: 'test-results/melee-keyboard-dodge.png' });
});

test('shade dash deals one hit with impact VFX and misses a sideways keyboard dodge', async ({ page }) => {
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!, p = api.getPlayerPosition();
    api.spawnEnemyTypeAt('shade', p.x - 110, p.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp < 100);
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(86);
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().children.list.some(o => {
    const sprite = o as Phaser.GameObjects.Sprite;
    return sprite.texture?.key === 'player_skill_hit' && sprite.active;
  }))).toBe(true);
  await page.waitForTimeout(150);
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(86);
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!; api.clearEnemies();
    const scene = api.getScene() as unknown as Runtime;
    scene.damage.state.invulnerableUntilMs = 0;
    const p = api.getPlayerPosition(); api.spawnEnemyTypeAt('shade', p.x - 110, p.y);
  });
  await page.waitForTimeout(100);
  await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w');
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(86);
});
