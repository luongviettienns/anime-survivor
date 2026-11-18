import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { EnemySystem } from '../../src/game/systems/EnemySystem';
import type { WeaponInventory } from '../../src/domain/weapons';
import type { EnemyArchetypeId } from '../../src/domain/enemies';

type Runtime = Phaser.Scene & {
  enemies: EnemySystem; weapon: { inventory: WeaponInventory }; spawnTimer: Phaser.Time.TimerEvent;
};

test('all live monster types use authored north/south/side frames and mirror west', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  await page.evaluate(() => {
    const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
    scene.spawnTimer.paused = true;
    Object.assign(scene.weapon.inventory, { orb: 0, slash: 0, orbital: 0, mine: 0 });
  });
  for (const type of ['slime', 'shade', 'mage', 'boss'] as EnemyArchetypeId[]) {
    for (const [direction, dx, dy] of [['right', -300, 0], ['left', 300, 0], ['up', 0, 300], ['down', 0, -300]] as const) {
      await page.evaluate(({ type, dx, dy }) => {
        const api = window.__ANIME_SURVIVOR__!; api.clearEnemies();
        const p = api.getPlayerPosition(); api.spawnEnemyTypeAt(type, p.x + dx, p.y + dy);
        api.getScene().cameras.main.stopFollow().centerOn(p.x + dx / 2, p.y + dy / 2);
      }, { type, dx, dy });
      await page.waitForTimeout(130);
      const pose = await page.evaluate(() => {
        const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
        const enemy = scene.enemies.group.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
        const data = enemy.frame.customData as { animation: string; opaqueHeight: number };
        return { facing: enemy.getData('enemy-facing') as string, animation: data.animation, flip: enemy.flipX,
          height: data.opaqueHeight * enemy.scaleY, body: enemy.body!.width,
          feet: (192 - enemy.displayOriginY) * enemy.scaleY, anchor: enemy.getData('footOffset') as number };
      });
      expect(pose.facing).toBe(direction);
      expect(pose.animation).toBe(direction === 'up' ? 'walk-up' : direction === 'down' ? 'walk' : 'walk-side');
      expect(pose.flip).toBe(direction === 'left');
      expect(pose.height).toBeCloseTo(type === 'boss' ? 128 : 64);
      expect(pose.body).toBeCloseTo(type === 'boss' ? 64 : 32);
      expect(pose.feet).toBeCloseTo(pose.anchor);
      if (type === 'boss') await page.screenshot({ path: `test-results/boss-walk-${direction}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test('mage and boss casting follows directional palms and projectiles never overlay actors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?play=1');
  await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
  for (const type of ['mage', 'boss'] as const) for (const [direction, dx, dy] of [
    ['right', -300, 0], ['left', 300, 0], ['up', 0, 300], ['down', 0, -300],
  ] as const) {
    await page.evaluate(({ type, dx, dy }) => {
      const api = window.__ANIME_SURVIVOR__!;
      const scene = api.getScene() as unknown as Runtime;
      scene.scene.resume(); scene.spawnTimer.paused = true; api.clearEnemies();
      Object.assign(scene.weapon.inventory, { orb: 0, slash: 0, orbital: 0, mine: 0 });
      const p = api.getPlayerPosition(); const enemy = scene.enemies.spawnAt(p.x + dx, p.y + dy, type);
      scene.cameras.main.stopFollow().centerOn(p.x + dx / 2, p.y + dy / 2);
      const state = scene.enemies.getState(enemy)!;
      state.ranged.phase = 'telegraph'; state.ranged.telegraphEndsAtMs = scene.time.now + 2000;
    }, { type, dx, dy });
    await page.waitForTimeout(50);
    const charge = await page.evaluate(() => {
      const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
      scene.scene.pause();
      const enemy = scene.enemies.group.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
      const data = enemy.frame.customData as { animation: string; poseIndex: number };
      const glows = scene.children.list.filter((child) => child.getData('enemy-hand-charge')) as Phaser.GameObjects.Sprite[];
      return { animation: data.animation, pose: data.poseIndex, glows: glows.filter((sprite) => sprite.visible)
        .map((sprite) => { const metrics = sprite.frame.customData as { opaqueHeight: number };
          return { height: metrics.opaqueHeight * sprite.scaleY, offset: Math.hypot(sprite.x - enemy.x, sprite.y - enemy.y) }; }) };
    });
    expect(charge.animation).toBe(direction === 'up' ? 'cast-up' : direction === 'down' ? 'cast' : 'cast-side');
    expect(charge.pose).toBe(0);
    expect(charge.glows).toHaveLength(type === 'boss' ? 2 : 1);
    expect(charge.glows.every((glow) => glow.height <= 12.01 && glow.offset > 3)).toBe(true);
    await page.screenshot({ path: `test-results/${type}-charge-${direction}.png` });
    await page.evaluate(() => {
      const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
      const enemy = scene.enemies.group.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
      scene.enemies.getState(enemy)!.ranged.telegraphEndsAtMs = scene.time.now;
      scene.scene.resume();
    });
    await page.waitForFunction(() => window.__ANIME_SURVIVOR__!.getCounts().enemyProjectiles > 0);
    const release = await page.evaluate(() => {
      const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime; scene.scene.pause();
      const enemy = scene.enemies.group.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
      const data = enemy.frame.customData as { animation: string; poseIndex: number };
      return { animation: data.animation, pose: data.poseIndex, bolts: scene.enemies.enemyProjectiles.getChildren()
        .filter((object) => object.active).map((object) => {
          const bolt = object as Phaser.Physics.Arcade.Sprite;
          const body = bolt.body as Phaser.Physics.Arcade.Body;
          return { belowCaster: bolt.depth < enemy.depth, width: body.width,
            centerError: Math.hypot(body.center.x - bolt.x, body.center.y - bolt.y) };
        }) };
    });
    expect(release.animation).toBe(charge.animation); expect(release.pose).toBe(1);
    expect(release.bolts).toHaveLength(type === 'boss' ? 8 : 1);
    for (const bolt of release.bolts) {
      expect(bolt.belowCaster).toBe(true); expect(bolt.width).toBeCloseTo(17);
      expect(bolt.centerError).toBeLessThan(1.5);
    }
    await page.screenshot({ path: `test-results/${type}-release-${direction}.png` });
    const start = await page.evaluate(() => {
      const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime;
      const bolt = scene.enemies.enemyProjectiles.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
      const body = bolt.body as Phaser.Physics.Arcade.Body;
      const probe = { seconds: 0, step: (delta: number) => { probe.seconds += delta; } };
      bolt.setData('flight-probe', probe); scene.physics.world.on('worldstep', probe.step);
      scene.scene.resume(); return { x: bolt.x, y: bolt.y, speed: body.velocity.length() };
    });
    await page.waitForTimeout(100);
    const motion = await page.evaluate((start) => {
      const scene = window.__ANIME_SURVIVOR__!.getScene() as unknown as Runtime; scene.scene.pause();
      const bolt = scene.enemies.enemyProjectiles.getFirstAlive() as Phaser.Physics.Arcade.Sprite;
      const probe = bolt.getData('flight-probe') as { seconds: number; step: (delta: number) => void };
      scene.physics.world.off('worldstep', probe.step);
      return { actual: Math.hypot(bolt.x - start.x, bolt.y - start.y), expected: start.speed * probe.seconds };
    }, start);
    expect(start.speed).toBeCloseTo(type === 'boss' ? 260 : 280);
    expect(motion.actual).toBeGreaterThan(5);
    expect(Math.abs(motion.actual - motion.expected)).toBeLessThan(8);
  }
  expect(errors).toEqual([]);
});
