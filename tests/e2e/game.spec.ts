import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1-4 Gameplay & Stress E2E', () => {
  test('A: boots game, normalizes diagonal vs cardinal displacement, and has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?play=1');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width', '1280');
    await expect(canvas).toHaveAttribute('height', '720');
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
    await page.goto('/?play=1');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.waitForTimeout(150);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).colliders).toBe(3);
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!, pos = (api.clearEnemies(), api.getPlayerPosition());
      api.spawnEnemyAt(pos.x, pos.y); api.spawnEnemyAt(pos.x, pos.y); api.spawnEnemyAt(pos.x, pos.y);
    });
    await page.waitForTimeout(100);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(90);
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!, pos = (api.clearEnemies(), api.getPlayerPosition()); api.spawnEnemyAt(pos.x + 90, pos.y); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getActiveDamageTexts() >= 1);
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1 && window.__ANIME_SURVIVOR__!.getProgression().xp >= 1, undefined, { timeout: 3000 });
    const audio = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());
    expect(audio.shoot).toBeGreaterThanOrEqual(1); expect(audio.hit).toBeGreaterThanOrEqual(1);
    expect(audio.pickup).toBeGreaterThanOrEqual(1); expect(audio.hurt).toBeGreaterThanOrEqual(1);
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).toMatchObject({ colliders: 3, pickups: 0 });
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!, pos = api.getPlayerPosition(); api.spawnHealAt(pos.x + 60, pos.y, 25); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 100, undefined, { timeout: 2000 });
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts())).pickups).toBe(0);
    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('HP 100/100'); expect(hudText).toContain('KILLS 1'); expect(hudText).toContain('ORB Lv1');
  });

  test('F: opens UpgradeScene with icons on level-up, applies weapon upgrades, and executes slash + orbital + mine', async ({ page }) => {
    await page.goto('/?play=1');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => { window.__ANIME_SURVIVOR__!.clearEnemies(); window.__ANIME_SURVIVOR__!.grantXp(9); });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2000 });
    await page.waitForTimeout(220);
    await page.screenshot({ path: 'test-results/qa-upgrade-ui.png' });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression())).toMatchObject({ level: 2, pendingUpgrades: 1 });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0))).toBe(true);
    expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression())).pendingUpgrades).toBe(0);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as { weapon: { inventory: { orb: number; slash: number; orbital: number; mine: number } }; updateHud: () => void };
      scene.weapon.inventory.orb = 0; scene.weapon.inventory.slash = 1; scene.weapon.inventory.orbital = 1; scene.weapon.inventory.mine = 1;
      scene.updateHud(); api.clearEnemies(); api.spawnEnemyAt(api.getPlayerPosition().x + 56, api.getPlayerPosition().y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1, undefined, { timeout: 3000 });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeaponInventory())).toMatchObject({ slash: 1, orbital: 1, mine: 1 });
    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('PUNCH Lv1'); expect(hudText).toContain('ORBIT Lv1'); expect(hudText).toContain('MINE Lv1');
  });

  test('H: 120-enemy stress benchmark maintains stability, pooling, and zero console errors under heavy combat', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/?play=1');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as {
        weapon: { inventory: { orb: number; slash: number; orbital: number; mine: number } };
        passives: { critChance: number; cooldownReductionMs: number };
        updateHud: () => void;
      };
      scene.weapon.inventory = { orb: 4, slash: 4, orbital: 4, mine: 3 };
      scene.passives.critChance = 0.3;
      scene.passives.cooldownReductionMs = 150;
      scene.updateHud();
    });
    expect(await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; api.clearEnemies(); return api.spawnSwarm(120); })).toBe(120);
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-results/qa-combat-vfx.png' });

    await page.keyboard.down('d'); await page.waitForTimeout(450);
    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; while (api.getProgression().pendingUpgrades > 0 && api.chooseUpgrade(0)); api.spawnSwarm(128 - api.getCounts().enemies); });
    await page.waitForTimeout(300); await page.keyboard.up('d');
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene();
      if (scene.scene.isActive('UpgradeScene')) {
        scene.scene.stop('UpgradeScene');
        scene.scene.resume('GameScene');
      }
      (scene as unknown as { openUpgradeModalIfNeeded: () => void }).openUpgradeModalIfNeeded = () => {};
    });
    await page.waitForTimeout(250);
    // Keep the measured load controlled; screenshot latency must not determine survivor count.
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.spawnSwarm(Math.max(0, 120 - api.getCounts().enemies));
    });
    await page.waitForTimeout(100);

    const stats = await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      return { counts: api.getCounts(), dmgTexts: api.getActiveDamageTexts(), delta: api.getFrameDeltaMs(), player: api.getPlayerState(), prog: api.getProgression(), audio: api.getAudioCounts() };
    });
    expect(stats.counts.colliders).toBe(3); expect(stats.counts.enemies).toBeGreaterThanOrEqual(80); expect(stats.counts.enemies).toBeLessThanOrEqual(130);
    expect(stats.dmgTexts).toBeGreaterThanOrEqual(1); expect(stats.dmgTexts).toBeLessThanOrEqual(24);
    expect(stats.delta).toBeGreaterThan(0); expect(stats.delta).toBeLessThan(100);
    expect(stats.player.alive).toBe(true); expect(stats.prog.defeated).toBeGreaterThanOrEqual(1);
    expect(stats.audio.shoot).toBeGreaterThanOrEqual(1); expect(stats.audio.hit).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: 'test-results/qa-combat-vfx.png' });
    await page.screenshot({ path: 'test-results/anime-survivor.png' });
  });

  test('I: verifies endless map chunks, shade/mage/telegraph, PauseScene settings, Boss Phase 2 Victory, and LocalStorage', async ({ page }) => {
    await page.goto('/?play=1');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => { window.__ANIME_SURVIVOR__!.teleportPlayer(2600, -1100); });
    await page.waitForTimeout(120);
    const farPos = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    expect(farPos.x).toBeGreaterThan(2200); expect(farPos.y).toBeLessThan(-900);
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getLoadedChunks())).toBe(9);

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
      const scene = api.getScene() as unknown as { weapon: { inventory: { orb: number } }; damage: { state: { hp: number; invulnerableUntilMs: number } } };
      scene.weapon.inventory.orb = 0; scene.damage.state.hp = 100; scene.damage.state.invulnerableUntilMs = -Infinity;
      api.clearEnemies(); api.spawnEnemyTypeAt('mage', api.getPlayerPosition().x + 180, api.getPlayerPosition().y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getCounts().enemyProjectiles >= 1, undefined, { timeout: 2500 });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 88, undefined, { timeout: 2500 });

    await page.evaluate(() => { const api = window.__ANIME_SURVIVOR__!; api.clearEnemies(); api.spawnBossAt(api.getPlayerPosition().x + 130, api.getPlayerPosition().y); (api.getScene() as unknown as { updateHud: () => void }).updateHud(); });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getBossState())).toEqual({ hp: 4500, maxHp: 4500, name: 'CRIMSON ARCHON' });
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText())).toContain('CRIMSON ARCHON  4500/4500');

    // Trigger Boss Phase 2 Enraged & capture endless boss combat screenshot
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!, scene = api.getScene() as unknown as { enemies: { group: { getChildren: () => unknown[] }; getState: (e: unknown) => { hp: number } }; updateHud: () => void };
      const boss = scene.enemies.group.getChildren().find((c) => (c as { active: boolean }).active);
      if (boss) scene.enemies.getState(boss).hp = 420;
      scene.updateHud();
    });
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText())).toContain('[ENRAGED]');
    await page.screenshot({ path: 'test-results/qa-boss-endless.png' });

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
