import { expect, test } from '@playwright/test';

type LobbyApi = { getSelectedHeroId: () => string; isActive: () => boolean };

test('opens Lobby & Character Select by default at /, previews Naruto & unlocked Kirito, and starts GameScene', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __ANIME_SURVIVOR_LOBBY__?: LobbyApi }).__ANIME_SURVIVOR_LOBBY__?.isActive()));
  await page.waitForTimeout(300);

  expect(await page.evaluate(() => Boolean(window.__ANIME_SURVIVOR__))).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { __ANIME_SURVIVOR_LOBBY__: LobbyApi }).__ANIME_SURVIVOR_LOBBY__.getSelectedHeroId())).toBe('naruto');
  await page.screenshot({ path: 'test-results/lobby-screen.png' });

  // Switch to Kirito (now unlocked!) with key '2' and capture unlocked showcase
  await page.keyboard.press('2');
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as unknown as { __ANIME_SURVIVOR_LOBBY__: LobbyApi }).__ANIME_SURVIVOR_LOBBY__.getSelectedHeroId())).toBe('kirito');
  await page.screenshot({ path: 'test-results/lobby-kirito-unlocked.png' });

  // Switch back to Naruto ('1'), toggle Mute ('M'), and start GameScene ('Enter')
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__), undefined, { timeout: 4000 });
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).colliders).toBe(3);

  // PauseScene [T] returns back to Lobby TitleScene cleanly
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().scene.isActive('PauseScene'));
  await page.keyboard.press('t');
  await page.waitForFunction(() => Boolean((window as unknown as { __ANIME_SURVIVOR_LOBBY__?: LobbyApi }).__ANIME_SURVIVOR_LOBBY__?.isActive()));
  expect(errors).toEqual([]);
});
