import { expect, test } from '@playwright/test';

test('verifies flat damage reduction, minute-scaled enemies, and deterministic heal/magnet drops', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));

  // Minute-5 scaled slime (170 HP, 25 Dmg, 3 XP) against 5 flat damage reduction => 20 Dmg taken
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      data: { set: (k: string, v: unknown) => void; get: (k: string) => unknown };
      elapsed: number;
      passives: { damageReduction: number };
      enemies: { spawnAt: (x: number, y: number, arch: 'slime', elapsedSec?: number) => { getData: (k: string) => unknown }; getState: (e: unknown) => { maxHp: number; touchDamage: number; xpValue: number } };
      spawnTimer?: { paused: boolean };
    };
    if (scene.spawnTimer) scene.spawnTimer.paused = true;
    api.clearEnemies();
    scene.passives.damageReduction = 5;
    const p = api.getPlayerPosition();
    const scaled = scene.enemies.spawnAt(p.x, p.y, 'slime', 300);
    scene.data.set('scaled-slime', scene.enemies.getState(scaled));
  });
  await page.waitForTimeout(100);
  const scaled = await page.evaluate(() => ({
    enemy: (window.__ANIME_SURVIVOR__!.getScene().data.get('scaled-slime') as { maxHp: number; touchDamage: number; xpValue: number }),
    hp: window.__ANIME_SURVIVOR__!.getPlayerState().hp,
  }));
  expect(scaled.enemy).toMatchObject({ maxHp: 170, touchDamage: 25, xpValue: 3 });
  expect(scaled.hp).toBe(80);

  // Deterministic heal at 25th normal kill and global magnet pull at 90th normal kill
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      normalKills: number;
      onEnemyKilled: (x: number, y: number, arch: 'slime', xp: number) => void;
      pickups: { spawnXpGem: (x: number, y: number, v: number) => void; getActivePickups: () => Array<{ type: string; x: number }> };
    };
    api.clearEnemies();
    const p = api.getPlayerPosition();
    scene.pickups.spawnXpGem(p.x + 280, p.y, 1);
    scene.normalKills = 24;
    scene.onEnemyKilled(p.x + 120, p.y, 'slime', 1);
    scene.normalKills = 89;
    scene.onEnemyKilled(p.x, p.y, 'slime', 1);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().xp >= 3, undefined, { timeout: 2500 });
  const drops = await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as {
      pickups: { getActivePickups: () => Array<{ type: string }> };
    };
    return scene.pickups.getActivePickups().map((p) => p.type);
  });
  expect(drops).toContain('heal');
  expect(drops).not.toContain('magnet');
  expect(errors).toEqual([]);
});

test('verifies elite purple aura/drops, 120s encirclement ring, and boss_blood_slash melee strike', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));

  // Trigger 120s encirclement ring + 90s elite spawn (purple aura)
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      spawnTimer?: { paused: boolean };
      enemies: { stepWaves: (deltaMs: number, elapsedSec: number, vel: { x: number; y: number }) => void };
    };
    if (scene.spawnTimer) scene.spawnTimer.paused = true;
    api.clearEnemies();
    scene.enemies.stepWaves(2000, 120, { x: 250, y: 0 });
  });
  const ringCheck = await page.evaluate(() => ({
    enemies: window.__ANIME_SURVIVOR__!.getCounts().enemies,
    auraSprites: window.__ANIME_SURVIVOR__!.getScene().children.list.filter((o) => {
      const s = o as { texture?: { key?: string }; visible?: boolean };
      return s.texture?.key === 'aura_ring' && s.visible;
    }).length,
  }));
  expect(ringCheck.enemies).toBeGreaterThanOrEqual(15);
  expect(ringCheck.auraSprites).toBeGreaterThanOrEqual(1);

  // Elite #1 drops distant 15 XP + heal; Elite #2 at player drops magnet which pulls distant 15 XP -> Lv.3
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      onEnemyKilled: (x: number, y: number, arch: 'elite', xp: number) => void;
    };
    api.clearEnemies();
    const p = api.getPlayerPosition();
    scene.onEnemyKilled(p.x + 200, p.y, 'elite', 15);
    scene.onEnemyKilled(p.x, p.y, 'elite', 15);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2500 });
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 3, undefined, { timeout: 2500 });
  await page.evaluate(() => window.__ANIME_SURVIVOR__!.chooseUpgrade(0));
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getUpgradeChoices().length === 0, undefined, { timeout: 2500 });
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getProgression())).level).toBeGreaterThanOrEqual(3);

  // Trigger boss_blood_slash inside 135px range -> 42 damage (100 -> 58)
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as {
      damage: { state: { hp: number; invulnerableUntilMs: number } };
      passives: { damageReduction: number };
    };
    api.clearEnemies();
    scene.passives.damageReduction = 0;
    scene.damage.state.hp = 100;
    scene.damage.state.invulnerableUntilMs = -Infinity;
    const p = api.getPlayerPosition();
    api.spawnBossAt(p.x + 80, p.y);
  });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getPlayerState().hp === 58, undefined, { timeout: 2500 });
  expect(errors).toEqual([]);
});
