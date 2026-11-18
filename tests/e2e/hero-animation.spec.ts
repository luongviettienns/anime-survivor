import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';

test('Naruto animates all four directions and remembers facing with real keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      weapon: { inventory: Record<string, number> }; spawnTimer: Phaser.Time.TimerEvent;
    };
    scene.spawnTimer.paused = true; api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 0, orbital: 0, mine: 0 });
  });
  const state = () => page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    const hero = scene.children.list.find((child) =>
      (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
    ) as Phaser.GameObjects.Sprite;
    const visual = scene.children.list.find((child) => child.getData('hero-action')) as Phaser.GameObjects.Sprite;
    const metrics = visual.frame.customData as { opaqueHeight: number };
    return {
      animation: hero.anims.currentAnim?.key, frame: Number(hero.frame.name),
      flipX: hero.flipX, width: hero.frame.width, height: hero.frame.height,
      frames: hero.anims.currentAnim?.frames.map((frame) => Number(frame.textureFrame)),
      derived: visual.texture.key === 'hero_locomotion' && visual.frame.source.width >= 128 && visual.frame.source.width <= 256,
      visibleHeight: metrics.opaqueHeight * visual.scaleY,
      legacyHidden: !hero.visible,
    };
  });
  expect(await state()).toMatchObject({ animation: 'hero-idle', width: 32, height: 32, frames: [0, 1, 2, 3] });
  expect(await state()).toMatchObject({ derived: true, visibleHeight: 112, legacyHidden: true });
  await page.keyboard.down('d');
  await expect.poll(async () => (await state()).animation).toBe('hero-walk');
  expect(await state()).toMatchObject({ flipX: false, frames: [4, 5, 6, 7] });
  const seen = new Set<number>();
  for (let i = 0; i < 12; i++) {
    seen.add((await state()).frame);
    await page.waitForTimeout(50);
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: 'test-results/naruto-running.png' });
  await page.keyboard.up('d');
  await expect.poll(async () => (await state()).animation).toBe('hero-idle-side');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await state()).flipX).toBe(true);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(async () => (await state()).animation).toBe('hero-idle-side');
  expect((await state()).flipX).toBe(true);
  await page.screenshot({ path: 'test-results/naruto-idle.png' });

  for (const [key, direction, frames, idle] of [
    ['w', 'up', [11, 12], 'hero-idle-up'],
    ['ArrowDown', 'down', [8, 9], 'hero-idle'],
  ] as const) {
    await page.keyboard.down(key);
    await expect.poll(async () => (await state()).animation).toBe(`hero-walk-${direction}`);
    expect(await state()).toMatchObject({ flipX: false, frames: [...frames] });
    const verticalFrames = new Set<number>();
    for (let i = 0; i < 8; i++) {
      verticalFrames.add((await state()).frame);
      await page.waitForTimeout(50);
    }
    expect(verticalFrames.size).toBe(2);
    await page.screenshot({ path: `test-results/naruto-${direction}.png` });
    await page.keyboard.up(key);
    await expect.poll(async () => (await state()).animation).toBe(idle);
    expect((await state()).flipX).toBe(false);
    expect((await state()).derived).toBe(true);
    expect(Math.abs((await state()).visibleHeight - 112)).toBeLessThan(2);
  }
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await expect.poll(async () => (await state()).animation).toBe('hero-walk');
  await page.keyboard.up('d');
  await expect.poll(async () => (await state()).animation).toBe('hero-walk-up');
  await page.keyboard.up('w');
  await expect.poll(async () => (await state()).animation).toBe('hero-idle-up');
  expect(errors).toEqual([]);
});
