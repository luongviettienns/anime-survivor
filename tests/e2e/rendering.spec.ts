import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';

test('map, actors, HUD and skills use smooth original-image sampling', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  const rendering = await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    const keys = ['hero_locomotion', 'hero_actions', 'enemy', 'boss', 'tree',
      'grass', 'hud_panel', 'rasengan', 'punch', 'enemy_bolt', 'icon-weapon_orb'];
    return {
      pixelArt: scene.game.config.pixelArt, antialias: scene.game.config.antialias,
      canvas: getComputedStyle(scene.game.canvas).imageRendering,
      sources: keys.flatMap((key) => scene.textures.get(key).source.map((source) => ({
        key, filter: source.scaleMode,
        min: source.glTexture?.minFilter, mag: source.glTexture?.magFilter,
      }))),
    };
  });
  expect(rendering).toMatchObject({ pixelArt: false, antialias: true, canvas: 'auto' });
  for (const source of rendering.sources) {
    expect(source.filter, source.key).toBe(0);
    expect(source.min, source.key).toBe(9729);
    expect(source.mag, source.key).toBe(9729);
  }
  await page.keyboard.down('d');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  const visible = await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    const actor = scene.children.list.find((child) => child.getData('hero-action')) as Phaser.GameObjects.Sprite;
    return actor.visible;
  });
  expect(visible).toBe(true);
  await page.screenshot({ path: 'test-results/smooth-map-rendering.png' });
  expect(errors).toEqual([]);
});
