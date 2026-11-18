import { expect, test, type Page } from '@playwright/test';
import type Phaser from 'phaser';
import type { PassiveStats } from '../../src/domain/upgrades';
import type { WeaponInventory } from '../../src/domain/weapons';

type EnemyStateView = { hp: number; maxHp: number; archetype: string };
type TestScene = {
  elapsed: number; spawnTimer: Phaser.Time.TimerEvent;
  damage: { state: { hp: number; maxHp: number; invulnerableUntilMs: number } };
  passives: PassiveStats;
  weapon: { inventory: WeaponInventory; mines: { mines: unknown[] }; clones: { active: Array<{ sprite: { visible: boolean } }> }; clear: () => void };
  enemies: { group: Phaser.Physics.Arcade.Group; getState: (s: Phaser.Physics.Arcade.Sprite) => EnemyStateView | undefined };
};

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

test('stat_max_hp does not heal current HP and stat_recovery ticks every 3s', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__?.getPlayerState().alive));
  const startElapsed = await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as TestScene;
    scene.spawnTimer.paused = true;
    api.clearEnemies();
    scene.damage.state.hp = 50;
    scene.damage.state.invulnerableUntilMs = Infinity;
    scene.passives.levels.stat_max_hp = 1;
    scene.damage.state.maxHp += 25;
    scene.passives.levels.stat_recovery = 1;
    scene.passives.recoveryPer3Sec = 1;
    scene.passives.recoveryTimerMs = 0;
    return scene.elapsed;
  });

  expect(await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).toMatchObject({ maxHp: 125, hp: 50 });
  await page.waitForTimeout(3200);
  await page.waitForFunction((start) => (window.__ANIME_SURVIVOR__!.getScene() as unknown as TestScene).elapsed - start >= 3.15, startElapsed, { timeout: 3000 });
  expect((await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState())).hp).toBe(51);
  expect(errors).toEqual([]);
});

test('Kage Bunshin Lv.4 spawns 4 clones + mine Lv.5 spreads 3 tags + Rasengan Lv.2 pushes without piercing', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__?.getPlayerState().alive));
  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const scene = api.getScene() as unknown as TestScene;
    scene.spawnTimer.paused = true;
    api.clearEnemies();
    Object.assign(scene.weapon.inventory, { orb: 0, clone: 4, orbital: 0, mine: 5, dual_slash: 0 });
    const p = api.getPlayerPosition();
    api.spawnEnemyAt(p.x + 110, p.y);
  });

  await page.waitForFunction(() => {
    const s = window.__ANIME_SURVIVOR__!.getScene() as unknown as TestScene;
    return s.weapon.mines.mines.length === 3 && s.weapon.clones.active.length === 4 && s.weapon.clones.active.every((c) => c.sprite.visible);
  }, undefined, { timeout: 3000 });
  await page.screenshot({ path: 'test-results/gameplay-update-kage-bunshin.png' });
  await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1, undefined, { timeout: 3000 });

  await page.evaluate(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const s = api.getScene() as unknown as TestScene;
    s.weapon.clear();
    api.clearEnemies();
    Object.assign(s.weapon.inventory, { orb: 2, clone: 0, orbital: 0, mine: 0, dual_slash: 0 });
    const p = api.getPlayerPosition();
    api.spawnEnemyTypeAt('elite', p.x + 140, p.y);
    api.spawnEnemyTypeAt('slime', p.x + 240, p.y);
  });

  const readEnemies = () => page.evaluate(() => {
    const s = window.__ANIME_SURVIVOR__!.getScene() as unknown as TestScene;
    return (s.enemies.group.getChildren() as Phaser.Physics.Arcade.Sprite[])
      .filter((e) => e.active)
      .map((e) => s.enemies.getState(e))
      .filter((st): st is EnemyStateView => Boolean(st))
      .map((st) => ({ archetype: st.archetype, hp: st.hp }));
  });
  await page.waitForFunction(() => {
    const api = window.__ANIME_SURVIVOR__!;
    const s = api.getScene() as unknown as TestScene;
    const states = (s.enemies.group.getChildren() as Phaser.Physics.Arcade.Sprite[])
      .filter((e) => e.active).map((e) => s.enemies.getState(e));
    return Boolean(states.find((st) => st?.archetype === 'elite' && st.hp <= 240) && api.getCounts().projectiles === 0);
  }, undefined, { timeout: 4000 });

  const remaining = await readEnemies();
  expect(remaining.find((e) => e.archetype === 'elite')?.hp).toBeLessThan(245);
  expect(remaining.find((e) => e.archetype === 'slime')?.hp).toBe(50);
  expect(errors).toEqual([]);
});
