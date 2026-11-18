import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';

test('Naruto idles, runs, faces left/right, and returns to idle with real keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  const state = () => page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene();
    const hero = scene.children.list.find((child) =>
      (child as Phaser.GameObjects.Sprite).texture?.key === 'hero'
    ) as Phaser.GameObjects.Sprite;
    return {
      animation: hero.anims.currentAnim?.key, frame: Number(hero.frame.name),
      flipX: hero.flipX, width: hero.frame.width, height: hero.frame.height,
      frames: hero.anims.currentAnim?.frames.map((frame) => Number(frame.textureFrame)),
    };
  });
  expect(await state()).toMatchObject({ animation: 'hero-idle', width: 32, height: 32, frames: [0, 1, 2, 3] });
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
  await expect.poll(async () => (await state()).animation).toBe('hero-idle');
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await state()).flipX).toBe(true);
  await page.keyboard.up('ArrowLeft');
  await expect.poll(async () => (await state()).animation).toBe('hero-idle');
  await page.screenshot({ path: 'test-results/naruto-idle.png' });
  expect(errors).toEqual([]);
});
