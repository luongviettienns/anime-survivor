import Phaser from 'phaser';
import { applyProjectileHit, createEnemyState, type EnemyState } from '../../domain/combat';
import type { TargetCandidate } from '../../domain/targeting';
import { chaseVelocity } from '../../domain/vector';
import { ENEMY, WORLD } from '../config/constants';

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextId = 1;
  private readonly states = new Map<Phaser.Physics.Arcade.Sprite, EnemyState>();

  constructor(scene: Phaser.Scene, private readonly target: Phaser.Physics.Arcade.Sprite) {
    this.group = scene.physics.add.group();
  }

  spawn(): Phaser.Physics.Arcade.Sprite | null {
    if (this.group.countActive(true) >= ENEMY.maxAlive) return null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance =
        ENEMY.spawnDistanceMin + Math.random() * (ENEMY.spawnDistanceMax - ENEMY.spawnDistanceMin);
      const x = this.target.x + Math.cos(angle) * distance;
      const y = this.target.y + Math.sin(angle) * distance;
      if (
        x >= ENEMY.worldMargin &&
        x <= WORLD.width - ENEMY.worldMargin &&
        y >= ENEMY.worldMargin &&
        y <= WORLD.height - ENEMY.worldMargin &&
        Math.hypot(x - this.target.x, y - this.target.y) >= ENEMY.spawnDistanceMin * 0.9
      ) {
        return this.spawnAt(x, y);
      }
    }
    const fallbackX =
      this.target.x < WORLD.width / 2
        ? Math.min(WORLD.width - ENEMY.worldMargin, this.target.x + ENEMY.spawnDistanceMin)
        : Math.max(ENEMY.worldMargin, this.target.x - ENEMY.spawnDistanceMin);
    const fallbackY = Phaser.Math.Clamp(
      this.target.y,
      ENEMY.worldMargin,
      WORLD.height - ENEMY.worldMargin
    );
    return this.spawnAt(fallbackX, fallbackY);
  }

  spawnAt(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const enemy = this.group.create(x, y, 'enemy') as Phaser.Physics.Arcade.Sprite;
    const state = createEnemyState(this.nextId++, ENEMY.baseHealth, ENEMY.baseSpeed);
    this.states.set(enemy, state);
    enemy.setScale(2).play('enemy-walk');
    enemy.setDepth(y);
    enemy.setCircle(8, 4, 6);
    return enemy;
  }

  getState(enemy: Phaser.Physics.Arcade.Sprite): EnemyState | undefined {
    return this.states.get(enemy);
  }

  getCandidates(): Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> {
    const list: Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> = [];
    for (const object of this.group.getChildren()) {
      const sprite = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(sprite);
      if (!state) continue;
      const body = sprite.body as Phaser.Physics.Arcade.Body | null;
      list.push({
        id: state.id,
        x: sprite.x,
        y: sprite.y,
        active: sprite.active,
        bodyEnabled: Boolean(body && body.enable),
        hp: state.hp,
        dead: state.dead,
        sprite,
      });
    }
    return list;
  }

  damageEnemy(
    enemyObject: Phaser.GameObjects.GameObject,
    damage: number
  ): { damaged: boolean; killed: boolean; x: number; y: number } {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    const state = this.states.get(enemy);
    const x = enemy.x;
    const y = enemy.y;
    if (!enemy.active || !state || state.dead) {
      return { damaged: false, killed: false, x, y };
    }
    const result = applyProjectileHit(state, damage);
    if (result.killed) {
      if (enemy.body) enemy.body.enable = false;
      this.states.delete(enemy);
      enemy.destroy();
    }
    return { damaged: result.damaged, killed: result.killed, x, y };
  }

  update(playerDead = false): void {
    for (const object of this.group.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(enemy);
      if (!enemy.active || !state || state.dead) continue;
      const vel = chaseVelocity(enemy, this.target, state.speed, playerDead);
      enemy.setVelocity(vel.x, vel.y);
      if (Math.abs(vel.x) > 1e-3) {
        enemy.setFlipX(vel.x < 0);
      }
      enemy.setDepth(enemy.y);
    }
  }

  clear(): void {
    this.states.clear();
  }
}
