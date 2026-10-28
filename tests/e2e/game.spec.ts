import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1 & 2 Gameplay Logic E2E', () => {
  test('A: boots game, normalizes diagonal vs cardinal displacement, and has no console errors', async ({
    page,
  }) => {
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
    const cardinalDist = Math.hypot(
      endCardinal.x - startCardinal.x,
      endCardinal.y - startCardinal.y
    );

    const startDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.keyboard.down('w');
    const diagVel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
    await page.waitForTimeout(300);
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

  test('B, C, D, E, G: enforces 3-enemy overlap single hit i-frames, auto-target kill, single pickup collider, magnetic attraction + pooling, heal clamp, and HUD updates', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.waitForTimeout(150);

    // Check G baseline: exactly 3 overlap colliders registered
    const initialCounts = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(initialCounts.colliders).toBe(3);

    // Check B: 3 enemies overlapping player simultaneously inflict 11 damage once
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
    });

    await page.waitForTimeout(100);
    const stateAfterOverlap = await page.evaluate(() =>
      window.__ANIME_SURVIVOR__!.getPlayerState()
    );
    expect(stateAfterOverlap.hp).toBe(89);

    // Check C & D: auto-targeting shoots and kills nearby enemy, dropping XP gem within magnet radius and magnetically collecting it
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x + 90, pos.y);
    });

    await page.waitForFunction(
      () =>
        window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1 &&
        window.__ANIME_SURVIVOR__!.getProgression().xp >= 1,
      undefined,
      { timeout: 3000 }
    );
    const countsAfterKill = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterKill.colliders).toBe(3);
    expect(countsAfterKill.pickups).toBe(0);

    // Check E: heal pickup within magnet radius (60px away) is magnetically pulled in, restores HP, and clamps at 100
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const pos = api.getPlayerPosition();
      api.spawnHealAt(pos.x + 60, pos.y, 25);
    });
    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 100,
      undefined,
      { timeout: 2000 }
    );
    const stateAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState());
    expect(stateAfterHeal.hp).toBe(100);
    const countsAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterHeal.pickups).toBe(0);

    // Verify HUD overlay text reflects updated HP, XP, kills, and weapon badge
    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('HP 100/100');
    expect(hudText).toContain('KILLS 1');
    expect(hudText).toContain('ORB Lv1');
  });

  test('F: opens UpgradeScene on level-up, applies weapon upgrades, and executes slash + orbital attacks', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());

    // Grant 5 XP to reach Lv2 and trigger UpgradeScene
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.grantXp(5));
    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3,
      undefined,
      { timeout: 2000 }
    );

    const progDuringModal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    expect(progDuringModal.level).toBe(2);
    expect(progDuringModal.pendingUpgrades).toBe(1);

    // Select first upgrade choice
    const applied = await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0));
    expect(applied).toBe(true);

    const progAfterModal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression());
    expect(progAfterModal.pendingUpgrades).toBe(0);

    // Unlock slash and orbital directly on inventory and verify close-range combat + HUD badges
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

    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1,
      undefined,
      { timeout: 3000 }
    );

    const weapons = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getWeaponInventory());
    expect(weapons.slash).toBe(1);
    expect(weapons.orbital).toBe(1);

    const hudText = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getScene().getHudText());
    expect(hudText).toContain('SLASH Lv1');
    expect(hudText).toContain('ORBIT Lv1');
  });
});
