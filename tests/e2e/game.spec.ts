import { expect, test } from '@playwright/test';

test('boots game, responds to controls, and has no browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  await page.keyboard.down('w');
  await page.waitForTimeout(250);
  await page.keyboard.up('w');
  await expect(canvas).toHaveAttribute('width', '960');
  await expect(canvas).toHaveAttribute('height', '540');
  await page.screenshot({ path: 'test-results/anime-survivor.png' });
  expect(errors).toEqual([]);
});
