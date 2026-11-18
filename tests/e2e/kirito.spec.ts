import { expect, test } from '@playwright/test';

type LobbyApi = { getSelectedHeroId: () => string; isActive: () => boolean };

test('Kirito unlocked lobby launch, high-defense stats, and Lv1/Lv3/Lv5 Dual Element waves with Slow & Burn', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __ANIME_SURVIVOR_LOBBY__?: LobbyApi }).__ANIME_SURVIVOR_LOBBY__?.isActive()));
  await page.keyboard.press('2');
  await page.waitForFunction(() => (window as unknown as { __ANIME_SURVIVOR_LOBBY__: LobbyApi }).__ANIME_SURVIVOR_LOBBY__.getSelectedHeroId() === 'kirito');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));

  // Verify Kirito stats and exclusive starting weapon
  const initial = await page.evaluate(() => ({
    player: window.__ANIME_SURVIVOR__!.getPlayerState(),
    weapons: window.__ANIME_SURVIVOR__!.getWeapons(),
  }));
  expect(initial.player).toMatchObject({ hp: 140, maxHp: 140, alive: true });
  expect(initial.weapons).toMatchObject({ dual_slash: 1, orb: 0 });

  // Verify Kirito armor (-5 Dmg): slime touch (11 - 5 = 6 dmg => 134 HP)
  await page.evaluate(() => {
    window.__ANIME_SURVIVOR__!.clearEnemies();
    const p = window.__ANIME_SURVIVOR__!.getPlayerPosition();
    window.__ANIME_SURVIVOR__!.spawnEnemyAt(p.x, p.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp < 140, undefined, { timeout: 3000 });
  const postHitHp = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp);
  expect(postHitHp).toBeGreaterThanOrEqual(130);
  expect(postHitHp).toBeLessThanOrEqual(136);

  // Verify Kirito move speed (~230 px/s)
  await page.keyboard.down('d');
  await page.waitForTimeout(60);
  const vel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
  await page.keyboard.up('d');
  expect(Math.hypot(vel.x, vel.y)).toBeCloseTo(230, 1);

  // Verify upgrade choices for Kirito offer dual_slash and never Naruto's orb
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.grantXp(9));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length > 0);
  const choices = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices());
  expect(choices.some((c) => c.id === 'weapon_orb')).toBe(false);
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);

  // Pause background wave spawner during controlled weapon-stage checks
  await page.evaluate(() => {
    const s = window.__ANIME_SURVIVOR__!.getScene() as unknown as { spawnTimer?: { paused: boolean } };
    if (s.spawnTimer) s.spawnTimer.paused = true;
    window.__ANIME_SURVIVOR__!.clearEnemies();
    window.__ANIME_SURVIVOR__!.setWeaponLevel('dual_slash', 1);
    const p = window.__ANIME_SURVIVOR__!.getPlayerPosition();
    window.__ANIME_SURVIVOR__!.spawnEnemyTypeAt('elite', p.x + 150, p.y);
  });
  await page.waitForFunction(() => {
    const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
    return st.length > 0 && st[0]!.slowActive;
  }, undefined, { timeout: 4000 });
  const lv1Status = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getEnemyStatuses()[0]!);
  expect(lv1Status.slowActive).toBe(true);
  expect(lv1Status.burnActive).toBe(false);
  await page.screenshot({ path: 'test-results/kirito-lv1-ice.png' });

  // Lv.3 Sequential Ice + Dark Fire -> Slow and Burn coexist independently, Burn ticks HP down
  await page.evaluate(() => {
    window.__ANIME_SURVIVOR__!.clearEnemies();
    window.__ANIME_SURVIVOR__!.setWeaponLevel('dual_slash', 3);
    const p = window.__ANIME_SURVIVOR__!.getPlayerPosition();
    window.__ANIME_SURVIVOR__!.spawnEnemyTypeAt('elite', p.x + 170, p.y);
  });
  await page.waitForFunction(() => {
    const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
    return st.length > 0 && st[0]!.slowActive && st[0]!.burnActive;
  }, undefined, { timeout: 5000 });
  const beforeBurn = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getEnemyStatuses()[0]!.hp);
  await page.screenshot({ path: 'test-results/kirito-lv2-sequential.png' });
  await page.waitForTimeout(600);
  const afterBurn = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getEnemyStatuses()[0]?.hp ?? 0);
  expect(afterBurn).toBeLessThan(beforeBurn);

  // Lv.5 Simultaneous Dual Element X Wave -> pierces multiple foes & applies Slow + Burn
  await page.evaluate(() => {
    window.__ANIME_SURVIVOR__!.clearEnemies();
    window.__ANIME_SURVIVOR__!.setWeaponLevel('dual_slash', 5);
    const p = window.__ANIME_SURVIVOR__!.getPlayerPosition();
    window.__ANIME_SURVIVOR__!.spawnEnemyTypeAt('elite', p.x + 140, p.y);
    window.__ANIME_SURVIVOR__!.spawnEnemyTypeAt('elite', p.x + 210, p.y);
  });
  await page.waitForFunction(() => {
    const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
    return st.length >= 2 && st.every((e) => e.slowActive && e.burnActive);
  }, undefined, { timeout: 5000 });
  await page.screenshot({ path: 'test-results/kirito-lv3-xwave.png' });

  // Verify small normal slimes take damage reliably in all 4 cardinal directions & close range
  for (const [dx, dy] of [[140, 0], [-140, 0], [0, 140], [0, -140], [18, 0]]) {
    await page.evaluate(([ox, oy]) => {
      window.__ANIME_SURVIVOR__!.clearEnemies();
      window.__ANIME_SURVIVOR__!.setWeaponLevel('dual_slash', 1);
      const p = window.__ANIME_SURVIVOR__!.getPlayerPosition();
      window.__ANIME_SURVIVOR__!.spawnEnemyAt(p.x + ox!, p.y + oy!);
    }, [dx, dy]);
    await page.waitForFunction(() => {
      const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
      return st.length === 0 || st[0]!.hp < 50;
    }, undefined, { timeout: 2500 });
  }

  expect(errors).toEqual([]);
});
