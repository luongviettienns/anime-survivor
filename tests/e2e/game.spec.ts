import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1 & 2 Gameplay Logic E2E', () => {
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
    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    const endCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const cardinalDist = Math.hypot(endCardinal.x - startCardinal.x, endCardinal.y - startCardinal.y);

    const startDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.keyboard.down('w');
    await page.waitForTimeout(50);
    const diagVel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
    await page.waitForTimeout(250);
    await page.keyboard.up('d');
    await page.keyboard.up('w');
    const endDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const diagDist = Math.hypot(endDiag.x - startDiag.x, endDiag.y - startDiag.y);

    expect(Math.hypot(diagVel.x, diagVel.y)).toBeCloseTo(250, 1);
    expect(cardinalDist).toBeGreaterThan(40);
    expect(Math.abs(diagDist - cardinalDist)).toBeLessThan(25);
    await page.screenshot({ path: 'test-results/anime-survivor.png' });
    expect(errors).toEqual([]);
  });

  test('B, C, D, E, G: enforces 3-enemy overlap single hit i-frames, auto-target kill, single pickup collider, magnetic attraction + pooling, heal clamp, and HUD updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.waitForTimeout(150);

    const initialCounts = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(initialCounts.colliders).toBe(3);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
    });

    await page.waitForTimeout(100);
    const stateAfterOverlap = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState());
    expect(stateAfterOverlap.hp).toBe(89);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x + 90, pos.y);
    });

    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1 && window.__ANIME_SURVIVOR__!.getProgression().xp >= 1,
      undefined,
      { timeout: 3000 }
    );
    const audioAfterKill = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());
    expect(audioAfterKill.shoot).toBeGreaterThanOrEqual(1);
    expect(audioAfterKill.hit).toBeGreaterThanOrEqual(1);
    expect(audioAfterKill.pickup).toBeGreaterThanOrEqual(1);
    expect(audioAfterKill.hurt).toBeGreaterThanOrEqual(1);

    const activeDmgTexts = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getActiveDamageTexts());
    expect(activeDmgTexts).toBeGreaterThanOrEqual(1);

    const countsAfterKill = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterKill.colliders).toBe(3);
    expect(countsAfterKill.pickups).toBe(0);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const pos = api.getPlayerPosition();
      api.spawnHealAt(pos.x + 60, pos.y, 25);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 100, undefined, { timeout: 2000 });
    const stateAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState());
    expect(stateAfterHeal.hp).toBe(100);
    const countsAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterHeal.pickups).toBe(0);

    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('HP 100/100');
    expect(hudText).toContain('KILLS 1');
    expect(hudText).toContain('ORB Lv1');
  });

  test('F: opens UpgradeScene on level-up, applies weapon upgrades, and executes slash + orbital attacks', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());

    await page.evaluate(() => window.__ANIME_SURVIVOR__!.grantXp(5));
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2000 });

    const progDuringModal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    expect(progDuringModal.level).toBe(2);
    expect(progDuringModal.pendingUpgrades).toBe(1);

    const applied = await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0));
    expect(applied).toBe(true);

    const progAfterModal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    expect(progAfterModal.pendingUpgrades).toBe(0);

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as {
        weapon: { inventory: { orb: number; slash: number; orbital: number } };
        updateHud: () => void;
      };
      scene.weapon.inventory.orb = 0;
      scene.weapon.inventory.slash = 1;
      scene.weapon.inventory.orbital = 1;
      scene.updateHud();
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x + 56, pos.y);
    });

    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1, undefined, { timeout: 3000 });

    const weapons = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeaponInventory());
    expect(weapons.slash).toBe(1);
    expect(weapons.orbital).toBe(1);

    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('SLASH Lv1');
    expect(hudText).toContain('ORBIT Lv1');
  });

  test('H & I: verifies shade, mage ranged hit, PauseScene settings toggle, Boss Victory, and LocalStorage persistence', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));

    // Verify PauseScene toggle, settings persistence (M/F/H), and Resume
    await page.keyboard.press('p');
    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getScene().scene.isActive('PauseScene'),
      undefined,
      { timeout: 1500 }
    );
    await page.keyboard.press('m');
    await page.keyboard.press('f');
    await page.keyboard.press('h');
    await page.waitForFunction(
      () => {
        const s = window.__ANIME_SURVIVOR__!.getSaveData().settings;
        return s.muted && s.reduceFlashing && s.reduceScreenShake;
      },
      undefined,
      { timeout: 1500 }
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__ANIME_SURVIVOR__!.isPaused(), undefined, { timeout: 1500 });

    const countsWhileMutedBefore = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());

    // 1. Spawn shade enemy, kill it with orb, and verify it drops 2 XP
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as { spawnTimer?: { paused: boolean } };
      if (scene.spawnTimer) scene.spawnTimer.paused = true;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyTypeAt('shade', pos.x + 75, pos.y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().xp === 2, undefined, { timeout: 3000 });
    const countsWhileMutedAfter = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getAudioCounts());
    expect(countsWhileMutedAfter.hit).toBe(countsWhileMutedBefore.hit);

    // 2. Disable player weapons, spawn mage at ranged distance, verify telegraph fires bolt and hits player (-12 HP)
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as { weapon: { inventory: { orb: number } } };
      scene.weapon.inventory.orb = 0;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyTypeAt('mage', pos.x + 180, pos.y);
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getCounts().enemyProjectiles >= 1, undefined, { timeout: 2500 });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 88, undefined, { timeout: 2500 });

    // 3. Spawn Boss, verify Boss HP bar in HUD, then kill Boss and verify Victory GameOverScene + SaveData persistence
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnBossAt(pos.x + 110, pos.y);
      (api.getScene() as unknown as { updateHud: () => void }).updateHud();
    });

    const bossState = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getBossState());
    expect(bossState).toEqual({ hp: 900, maxHp: 900, name: 'CRIMSON ARCHON' });
    const hudWithBoss = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudWithBoss).toContain('CRIMSON ARCHON  900/900');

    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as {
        weapon: { inventory: { orb: number } };
        enemies: { group: { getChildren: () => unknown[] }; getState: (e: unknown) => { hp: number } };
      };
      const bossSprite = scene.enemies.group.getChildren().find((c) => (c as { active: boolean }).active);
      if (bossSprite) scene.enemies.getState(bossSprite).hp = 15;
      scene.weapon.inventory.orb = 5;
    });

    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getScene().scene.isActive('GameOverScene'), undefined, { timeout: 3000 });
    const postRunSave = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getSaveData());
    expect(postRunSave.stats.victories).toBeGreaterThanOrEqual(1);
    expect(postRunSave.stats.bestKills).toBeGreaterThanOrEqual(2);
    expect(postRunSave.stats.runsPlayed).toBeGreaterThanOrEqual(1);
  });
});
