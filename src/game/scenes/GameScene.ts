import Phaser from 'phaser';
import { createProgression, xpThreshold, type RunProgression } from '../../domain/progression';
import { ENEMY, PROJECTILE, WORLD } from '../config/constants';
import { DamageSystem } from '../systems/DamageSystem';
import { registerGameDebugApi } from '../systems/DebugBridge';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: EnemySystem;
  private weapon!: WeaponSystem;
  private movement!: MovementSystem;
  private damage!: DamageSystem;
  private pickups!: PickupSystem;
  private hud!: Phaser.GameObjects.Text;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private progression: RunProgression = createProgression();
  private defeated = 0;
  private elapsed = 0;
  private running = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.progression = createProgression();
    this.defeated = 0;
    this.elapsed = 0;
    this.running = true;

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0);
    this.createScenery();

    this.player = this.physics.add.sprite(WORLD.width / 2, WORLD.height / 2, 'hero', 0);
    this.player.setScale(2).setCollideWorldBounds(true).setDepth(5000);
    this.player.setCircle(10, 6, 13).play('hero-idle');

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.movement = new MovementSystem(this, this.player);
    this.enemies = new EnemySystem(this, this.player);
    this.weapon = new WeaponSystem(this, this.player, this.enemies);
    this.damage = new DamageSystem(this.player);
    this.pickups = new PickupSystem(this);

    this.physics.add.overlap(this.weapon.projectiles, this.enemies.group, (a, b) =>
      this.onProjectileEnemy(a, b)
    );
    this.physics.add.overlap(this.player, this.enemies.group, () => this.onPlayerEnemyContact());
    this.physics.add.overlap(this.player, this.pickups.group, (_p, item) =>
      this.onPlayerPickup(item)
    );

    this.hud = this.add
      .text(16, 14, '', {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: '#1b1934bb',
        padding: { x: 12, y: 9 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    this.add
      .text(945, 20, 'WASD / Arrow keys', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e8d5ff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.spawnTimer = this.time.addEvent({
      delay: 1050,
      loop: true,
      callback: () => {
        if (!this.running) return;
        const amount = this.elapsed > 60 ? 2 : 1;
        for (let i = 0; i < amount && this.enemies.group.countActive(true) < ENEMY.maxAlive; i++) {
          this.enemies.spawn();
        }
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    registerGameDebugApi(
      this,
      this.player,
      this.damage,
      this.enemies,
      this.weapon,
      this.pickups,
      () => ({ ...this.progression, defeated: this.defeated })
    );
    this.updateHud();
  }

  update(_now: number, delta: number): void {
    if (!this.running || !this.damage.state.alive) return;
    this.elapsed += delta / 1000;
    this.movement.update(true);
    this.enemies.update(false);
    this.weapon.update(this.time.now, true);
    this.damage.updateVisuals(this.time.now);
    this.player.setDepth(this.player.y);

    if (this.elapsed >= WORLD.runDurationSec) {
      this.endRun(true);
      return;
    }
    this.updateHud();
  }

  private createScenery(): void {
    const random = new Phaser.Math.RandomDataGenerator(['anime-survivor-world-v1']);
    for (let i = 0; i < 100; i++) {
      const x = random.between(40, WORLD.width - 40);
      const y = random.between(40, WORLD.height - 40);
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < 190) continue;
      this.add.image(x, y, 'tree').setScale(random.realInRange(1.5, 2.2)).setDepth(y);
    }
  }

  private onProjectileEnemy(
    projectileObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0],
    enemyObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1]
  ): void {
    if (!this.running) return;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active) return;
    if (!this.weapon.consumeProjectile(projectileObject as Phaser.GameObjects.GameObject)) return;

    const outcome = this.enemies.damageEnemy(enemy, PROJECTILE.damage);
    if (!outcome.damaged) return;
    if (!outcome.killed) {
      enemy.setTint(0xffffff);
      this.time.delayedCall(85, () => {
        if (enemy.active) enemy.clearTint();
      });
      return;
    }
    this.defeated++;
    this.pickups.spawnXpGem(outcome.x, outcome.y);
  }

  private onPlayerEnemyContact(): void {
    if (!this.running || !this.damage.state.alive) return;
    const outcome = this.damage.tryContactDamage(this.time.now);
    if (outcome.died) {
      this.endRun(false);
    }
  }

  private onPlayerPickup(
    pickupObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1]
  ): void {
    if (!this.running || !this.damage.state.alive) return;
    const result = this.pickups.collect(
      pickupObject as Phaser.GameObjects.GameObject,
      this.damage.state,
      this.progression
    );
    if (result.collected && result.levelsGained > 0) {
      this.cameras.main.flash(160, 130, 90, 200);
    }
  }

  private endRun(victory: boolean): void {
    if (!this.running) return;
    this.running = false;
    this.movement.update(false);
    this.enemies.update(true);
    this.scene.start('GameOverScene', { victory, score: this.defeated });
  }

  private cleanup(): void {
    this.running = false;
    this.spawnTimer?.remove(false);
    this.enemies.clear();
    this.pickups.clear();
  }

  private updateHud(): void {
    const min = Math.floor(this.elapsed / 60)
      .toString()
      .padStart(2, '0');
    const sec = Math.floor(this.elapsed % 60)
      .toString()
      .padStart(2, '0');
    const { hp, maxHp } = this.damage.state;
    const { level, xp } = this.progression;
    this.hud.setText(
      `ANIME SURVIVOR  |  HP ${hp}/${maxHp}  |  LV ${level}  XP ${xp}/${xpThreshold(level)}\nTIME ${min}:${sec}  |  KILLS ${this.defeated}`
    );
  }
}
