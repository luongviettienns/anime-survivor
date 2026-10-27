import Phaser from 'phaser';
import {
  canWeaponFire,
  commitWeaponFire,
  createWeaponCooldown,
  selectNearestTarget,
} from '../../domain/targeting';
import { aimDirection, type Vec2 } from '../../domain/vector';
import { PLAYER, PROJECTILE } from '../config/constants';
import type { EnemySystem } from './EnemySystem';

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  private readonly cooldown = createWeaponCooldown(PLAYER.attackIntervalMs);
  private readonly consumedProjectiles = new WeakSet<Phaser.GameObjects.GameObject>();
  private lastAim: Vec2 = { x: 1, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly enemies: EnemySystem
  ) {
    this.projectiles = scene.physics.add.group();
  }

  update(nowMs: number, enabled = true): void {
    if (!enabled || !this.player.active) return;
    if (!canWeaponFire(this.cooldown, nowMs)) return;

    const target = selectNearestTarget(
      this.player,
      this.enemies.getCandidates(),
      PROJECTILE.range
    );
    if (!target) return;

    const direction = aimDirection(this.player, target, this.lastAim);
    this.lastAim = direction;
    const shot = this.projectiles.create(
      this.player.x,
      this.player.y,
      'orb'
    ) as Phaser.Physics.Arcade.Image;
    shot.setScale(2).setDepth(2000);
    shot.setVelocity(direction.x * PROJECTILE.speed, direction.y * PROJECTILE.speed);

    this.scene.time.delayedCall(PROJECTILE.lifeMs, () => {
      if (shot.active && !this.consumedProjectiles.has(shot)) {
        this.consumedProjectiles.add(shot);
        if (shot.body) shot.body.enable = false;
        shot.destroy();
      }
    });

    commitWeaponFire(this.cooldown, nowMs);
  }

  consumeProjectile(projectileObject: Phaser.GameObjects.GameObject): boolean {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image;
    if (!projectile.active || this.consumedProjectiles.has(projectile)) {
      return false;
    }
    this.consumedProjectiles.add(projectile);
    if (projectile.body) {
      projectile.body.enable = false;
    }
    projectile.destroy();
    return true;
  }
}
