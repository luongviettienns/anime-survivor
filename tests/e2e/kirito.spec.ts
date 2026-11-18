import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';

type LobbyApi = { getSelectedHeroId: () => string; isActive: () => boolean };

async function setupWave(page: Page, level: number, offsets: number[][], archetype: 'slime' | 'elite' = 'elite'): Promise<void> {
  await page.evaluate(({ level, offsets, archetype }) => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as { weapon: {
      projectiles: Phaser.Physics.Arcade.Group;
      consumeProjectile: (object: Phaser.GameObjects.GameObject) => boolean;
      dualSlash: { clear: () => void; cooldown: { nextAttackAtMs: number } };
    } };
    for (const shot of scene.weapon.projectiles.getChildren()) scene.weapon.consumeProjectile(shot);
    scene.weapon.dualSlash.clear(); scene.weapon.dualSlash.cooldown.nextAttackAtMs = 0;
    api.clearEnemies(); api.setWeaponLevel('dual_slash', level);
    for (const weapon of ['orb', 'slash', 'orbital', 'mine'] as const) api.setWeaponLevel(weapon, 0);
    const position = api.getPlayerPosition();
    for (const [x, y] of offsets) api.spawnEnemyTypeAt(archetype, position.x + x!, position.y + y!);
  }, { level, offsets, archetype });
}

test('Kirito unlocked lobby launch, high-defense stats, and Lv1/Lv3/Lv5 Dual Element waves with Slow & Burn', async ({ page }) => {
  test.setTimeout(60_000);
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
  const nonDashIdx = Math.max(0, choices.findIndex((c) => c.id !== 'skill_phantom_dash'));
  await page.evaluate((idx) => window.__ANIME_SURVIVOR__!.chooseUpgrade(idx), nonDashIdx);
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);

  // Pause background wave spawner during controlled weapon-stage checks
  await page.evaluate(() => {
    const s = window.__ANIME_SURVIVOR__!.getScene() as unknown as { spawnTimer?: { paused: boolean }; pickups: { update: () => void }; damage: { state: { invulnerableUntilMs: number } } };
    s.pickups.update = () => {}; s.damage.state.invulnerableUntilMs = Number.MAX_SAFE_INTEGER;
    if (s.spawnTimer) s.spawnTimer.paused = true;
  });
  await setupWave(page, 1, [[150, 0]]);
  await page.waitForFunction(() => {
    const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
    return st.length > 0 && st[0]!.slowActive;
  }, undefined, { timeout: 4000 });
  const lv1Status = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getEnemyStatuses()[0]!);
  expect(lv1Status.slowActive).toBe(true);
  expect(lv1Status.burnActive).toBe(false);
  await page.screenshot({ path: 'test-results/kirito-lv1-ice.png' });

  // Lv.2 Sequential Ice + Dark Fire -> Slow and Burn coexist independently, Burn ticks HP down
  await setupWave(page, 2, [[170, 0]]);
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
  await setupWave(page, 5, [[140, 0], [210, 0]]);
  await page.waitForFunction(() => {
    const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
    return st.length >= 2 && st.every((e) => e.slowActive && e.burnActive);
  }, undefined, { timeout: 5000 });
  await page.screenshot({ path: 'test-results/kirito-lv3-xwave.png' });

  // Verify small normal slimes take damage reliably in all 4 cardinal directions & close range
  for (const [dx, dy] of [[140, 0], [-140, 0], [0, 140], [0, -140], [18, 0]]) {
    await setupWave(page, 1, [[dx!, dy!]], 'slime');
    await page.waitForFunction(() => {
      const st = window.__ANIME_SURVIVOR__!.getEnemyStatuses();
      return st.length === 0 || st[0]!.hp < 50;
    }, undefined, { timeout: 2500 });
  }

  // Earn Dash through real upgrade cards before testing its movement and damage.
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await page.evaluate(() => window.__ANIME_SURVIVOR__!.getDashState().enabled)) break;
    const progress = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    const required = progress.level <= 5 ? 5 + progress.level * 4 : progress.level <= 15 ? 15 + progress.level * 6 : 30 + progress.level * 10;
    await page.evaluate(xp => window.__ANIME_SURVIVOR__!.grantXp(xp), required - progress.xp);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length > 0);
    const cards = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices());
    const dashIndex = cards.findIndex(c => c.id === 'skill_phantom_dash');
    await page.evaluate(index => window.__ANIME_SURVIVOR__!.chooseUpgrade(index), dashIndex >= 0 ? dashIndex : 0);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0);
  }
  // Verify Auto Phantom Dash Lv.1: dashes automatically to nearest slime, crosses just past 1 slime without hitting 2nd slime behind it
  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getDashState())).toMatchObject({ enabled: true, level: 1, dashing: false, cooldownRemainingMs: 0 });
  const dashBefore = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    api.setWeaponLevel('dual_slash', 0);
    api.clearEnemies();
    const p = api.getPlayerPosition();
    api.spawnEnemyAt(p.x + 110, p.y);
    api.spawnEnemyAt(p.x + 220, p.y);
  });
  await page.waitForFunction(() => {
    const d = window.__ANIME_SURVIVOR__!.getDashState();
    return !d.dashing && d.cooldownRemainingMs > 5000;
  }, undefined, { timeout: 5000 });
  await page.screenshot({ path: 'test-results/kirito-phantom-dash.png' });
  const dashAfter = await page.evaluate(() => ({
    pos: window.__ANIME_SURVIVOR__!.getPlayerPosition(),
    dash: window.__ANIME_SURVIVOR__!.getDashState(),
    statuses: window.__ANIME_SURVIVOR__!.getEnemyStatuses(),
  }));
  expect(dashAfter.pos.x - dashBefore.x).toBeGreaterThanOrEqual(130);
  expect(dashAfter.pos.x - dashBefore.x).toBeLessThan(190);
  expect(dashAfter.statuses.map((s) => s.hp)).toEqual([5, 50]);
  expect(dashAfter.dash.cooldownRemainingMs).toBeGreaterThan(5000);

  expect(errors).toEqual([]);
});
