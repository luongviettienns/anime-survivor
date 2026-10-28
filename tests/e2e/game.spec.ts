import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1-4 Gameplay & Stress E2E', () => {
  test('A: boots game, normalizes diagonal vs cardinal displacement, and has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width', '960');
    await expect(canvas).toHaveAttribute('height', '540');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());
    const startCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
    const endCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const cardinalDist = Math.hypot(endCardinal.x - startCardinal.x, endCardinal.y - startCardinal.y);
    const startDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d'); await page.keyboard.down('w'); await page.waitForTimeout(50);
    const diagVel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
    await page.waitForTimeout(250); await page.keyboard.up('d'); await page.keyboard.up('w');
    const endDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const diagDist = Math.hypot(endDiag.x - startDiag.x, endDiag.y - startDiag.y);
    expect(Math.hypot(diagVel.x, diagVel.y)).toBeCloseTo(250, 1);
    expect(cardinalDist).toBeGreaterThan(40);
    expect(Math.abs(diagDist - cardinalDist)).toBeLessThan(25);
    expect(errors).toEqual([]);
  });

  test('B, C, D, E, G: enforces 3-enemy overlap single hit i-frames, auto-target kill, single pickup collider, magnetic attraction + pooling, heal clamp, and HUD updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.waitForTimeout(150);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).colliders).toBe(3);
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!, pos = (api.clearEnemies(), api.getPlayerPosition());
      api.spawnEnemyAt(pos.x, pos.y); api.spawnEnemyAt(pos.x, pos.y); api.spawnEnemyAt(pos.x, pos.y);
    });
    await page.waitForTimeout(100);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(89);
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!, pos = (api.clearEnemies(), api.getPlayerPosition()); api.spawnEnemyAt(pos.x + 90, pos.y); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1 && window.__ANIME_SURVIVOR__!.getProgression().xp >= 1, undefined, { timeout: 3000 });
    const audio = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());
    expect(audio.shoot).toBeGreaterThanOrEqual(1); expect(audio.hit).toBeGreaterThanOrEqual(1);
    expect(audio.pickup).toBeGreaterThanOrEqual(1); expect(audio.hurt).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getActiveDamageTexts())).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).toMatchObject({ colliders: 3, pickups: 0 });
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!, pos = api.getPlayerPosition(); api.spawnHealAt(pos.x + 60, pos.y, 25); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 100, undefined, { timeout: 2000 });
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).pickups).toBe(0);
    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('HP 100/100'); expect(hudText).toContain('KILLS 1'); expect(hudText).toContain('ORB Lv1');
  });

  test('F: opens UpgradeScene on level-up, applies weapon upgrades, and executes slash + orbital attacks', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => { window.__ANIME_SURVIVOR__!.clearEnemies(); window.__ANIME_SURVIVOR__!.grantXp(5); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2000 });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression())).toMatchObject({ level: 2, pendingUpgrades: 1 });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0))).toBe(true);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression())).pendingUpgrades).toBe(0);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as { weapon: { inventory: { orb: number; slash: number; orbital: number } }; updateHud: () => void };
      scene.weapon.inventory.orb = 0; scene.weapon.inventory.slash = 1; scene.weapon.inventory.orbital = 1;
      scene.updateHud(); api.clearEnemies(); api.spawnEnemyAt(api.getPlayerPosition().x + 56, api.getPlayerPosition().y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1, undefined, { timeout: 3000 });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeaponInventory())).toMatchObject({ slash: 1, orbital: 1 });
    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('SLASH Lv1'); expect(hudText).toContain('ORBIT Lv1');
  });

  test('H: 120-enemy stress benchmark maintains stability, pooling, and zero console errors under heavy combat', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => { window.__ANIME_SURVIVOR__!.clearEnemies(); window.__ANIME_SURVIVOR__!.grantXp(140); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2000 });

    const upgraded = await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      while (api.getProgression().pendingUpgrades > 0) {
        const choices = api.getUpgradeChoices(), inv = api.getWeapons();
        let bestIdx = 0, bestScore = -1;
        choices.forEach((c, idx) => {
          const score = c.id === 'weapon_slash' ? 100 - inv.slash * 10 : c.id === 'weapon_orbital' ? 100 - inv.orbital * 10 : c.id === 'weapon_orb' ? 100 - inv.orb * 10 : c.id === 'stat_max_hp' ? 10 : 0;
          if (score > bestScore) { bestScore = score; bestIdx = idx; }
        });
        if (!api.chooseUpgrade(bestIdx)) break;
      }
      return api.getWeapons();
    });
    expect(upgraded.orb).toBeGreaterThanOrEqual(2); expect(upgraded.slash).toBeGreaterThanOrEqual(1); expect(upgraded.orbital).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; api.clearEnemies(); return api.spawnSwarm(120); })).toBe(120);

    await page.keyboard.down('d'); await page.waitForTimeout(400);
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; while (api.getProgression().pendingUpgrades > 0 && api.chooseUpgrade(0)); api.spawnSwarm(128 - api.getCounts().enemies); });
    await page.waitForTimeout(400); await page.keyboard.up('d');
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; while (api.getProgression().pendingUpgrades > 0 && api.chooseUpgrade(0)); });
    await page.screenshot({ path: 'test-results/anime-survivor.png' });

    const stats = await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      return { counts: api.getCounts(), dmgTexts: api.getActiveDamageTexts(), delta: api.getFrameDeltaMs(), player: api.getPlayerState(), prog: api.getProgression(), audio: api.getAudioCounts() };
    });
    expect(stats.counts.colliders).toBe(3); expect(stats.counts.enemies).toBeGreaterThanOrEqual(100); expect(stats.counts.enemies).toBeLessThanOrEqual(130);
    expect(stats.dmgTexts).toBeGreaterThanOrEqual(1); expect(stats.dmgTexts).toBeLessThanOrEqual(24);
    expect(stats.delta).toBeGreaterThan(0); expect(stats.delta).toBeLessThan(100);
    expect(stats.player.alive).toBe(true); expect(stats.prog.defeated).toBeGreaterThanOrEqual(1);
    expect(stats.audio.shoot).toBeGreaterThanOrEqual(1); expect(stats.audio.hit).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test('I: verifies shade, mage ranged hit, PauseScene settings toggle, Boss Victory, and LocalStorage persistence', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().scene.isActive('PauseScene'), undefined, { timeout: 1500 });
    await page.keyboard.press('m'); await page.keyboard.press('f'); await page.keyboard.press('h');
    await page.waitForFunction(() => { const s = window.__ANIME_SURVIVOR__!.getSaveData().settings; return s.muted && s.reduceFlashing && s.reduceScreenShake; }, undefined, { timeout: 1500 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__ANIME_SURVIVOR__!.isPaused(), undefined, { timeout: 1500 });

    const countsBefore = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!, scene = api.getScene() as unknown as { spawnTimer?: { paused: boolean } };
      if (scene.spawnTimer) scene.spawnTimer.paused = true;
      api.clearEnemies(); api.spawnEnemyTypeAt('shade', api.getPlayerPosition().x + 75, api.getPlayerPosition().y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().xp === 2, undefined, { timeout: 3000 });
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts())).hit).toBe(countsBefore.hit);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      (api.getScene() as unknown as { weapon: { inventory: { orb: number } } }).weapon.inventory.orb = 0;
      api.clearEnemies(); api.spawnEnemyTypeAt('mage', api.getPlayerPosition().x + 180, api.getPlayerPosition().y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getCounts().enemyProjectiles >= 1, undefined, { timeout: 2500 });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 88, undefined, { timeout: 2500 });

    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; api.clearEnemies(); api.spawnBossAt(api.getPlayerPosition().x + 110, api.getPlayerPosition().y); (api.getScene() as unknown as { updateHud: () => void }).updateHud(); });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getBossState())).toEqual({ hp: 900, maxHp: 900, name: 'CRIMSON ARCHON' });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText())).toContain('CRIMSON ARCHON  900/900');

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!, scene = api.getScene() as unknown as { weapon: { inventory: { orb: number } }; enemies: { group: { getChildren: () => unknown[] }; getState: (e: unknown) => { hp: number } } };
      const boss = scene.enemies.group.getChildren().find((c) => (c as { active: boolean }).active);
      if (boss) scene.enemies.getState(boss).hp = 15;
      scene.weapon.inventory.orb = 5;
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().scene.isActive('GameOverScene'), undefined, { timeout: 3000 });
    const postRunSave = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getSaveData());
    expect(postRunSave.stats.victories).toBeGreaterThanOrEqual(1); expect(postRunSave.stats.bestKills).toBeGreaterThanOrEqual(2); expect(postRunSave.stats.runsPlayed).toBeGreaterThanOrEqual(1);
  });
});
