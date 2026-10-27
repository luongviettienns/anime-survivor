import Phaser from 'phaser';
import { clampHealth } from '../../domain/combat';
import { awardXp, xpThreshold } from '../../domain/progression';
import { ENEMY, PLAYER, PROJECTILE, WORLD } from '../config/constants';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: EnemySystem;
  private weapon!: WeaponSystem;
  private movement!: MovementSystem;
  private hud!: Phaser.GameObjects.Text;
  private hp: number = PLAYER.maxHealth;
  private level = 1;
  private xp = 0;
  private defeated = 0;
  private elapsed = 0;
  private lastHurt = 0;

  constructor() { super('GameScene'); }

  create(): void {
    this.hp = PLAYER.maxHealth; this.level = 1; this.xp = 0;
    this.defeated = 0; this.elapsed = 0; this.lastHurt = 0;
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
    this.weapon = new WeaponSystem(this, this.player, this.enemies.group);
    this.physics.add.overlap(this.weapon.projectiles, this.enemies.group, (a, b) => this.hitEnemy(a, b));
    this.physics.add.overlap(this.player, this.enemies.group, () => this.hurtPlayer());
    this.hud = this.add.text(16, 14, '', {
      fontFamily: 'monospace', fontSize: '19px', color: '#ffffff',
      backgroundColor: '#1b1934bb', padding: { x: 12, y: 9 },
    }).setScrollFactor(0).setDepth(10000);
    this.add.text(945, 20, 'WASD / Arrow keys', {
      fontFamily: 'monospace', fontSize: '15px', color: '#e8d5ff',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10000);
    this.time.addEvent({ delay: 1050, loop: true, callback: () => {
      const amount = this.elapsed > 60 ? 2 : 1;
      for (let i = 0; i < amount && this.enemies.group.countActive() < 130; i++) this.enemies.spawn();
    } });
    this.updateHud();
  }

  update(_now: number, delta: number): void {
    this.elapsed += delta / 1000;
    this.movement.update();
    this.enemies.update();
    this.weapon.update(this.time.now);
    this.player.setDepth(this.player.y);
    if (this.elapsed >= 600) this.scene.start('GameOverScene', { victory: true, score: this.defeated });
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

  private hitEnemy(
    projectileObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0],
    enemyObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1]
  ): void {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!projectile.active || !enemy.active) return;
    projectile.destroy();
    const hp = (enemy.getData('hp') as number) - PROJECTILE.damage;
    enemy.setTint(0xffffff);
    this.time.delayedCall(85, () => { if (enemy.active) enemy.clearTint(); });
    if (hp > 0) { enemy.setData('hp', hp); return; }
    const x = enemy.x, y = enemy.y;
    enemy.destroy();
    this.defeated++;
    const gem = this.physics.add.image(x, y, 'gem').setScale(2);
    const pickup = this.physics.add.overlap(this.player, gem, () => {
      if (!gem.active) return;
      gem.destroy(); pickup.destroy();
      const next = awardXp({ level: this.level, xp: this.xp }, 1);
      this.level = next.level; this.xp = next.xp;
      if (next.levelsGained > 0) {
        this.hp = clampHealth(this.hp + 10 * next.levelsGained, PLAYER.maxHealth);
        this.cameras.main.flash(160, 130, 90, 200);
      }
    });
  }

  private hurtPlayer(): void {
    if (this.time.now - this.lastHurt < 800) return;
    this.lastHurt = this.time.now;
    this.hp = clampHealth(this.hp - ENEMY.touchDamage, PLAYER.maxHealth);
    this.player.setTint(0xff6677);
    this.time.delayedCall(160, () => { if (this.player.active) this.player.clearTint(); });
    if (this.hp === 0) this.scene.start('GameOverScene', { victory: false, score: this.defeated });
  }

  private updateHud(): void {
    const minutes = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const seconds = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
    this.hud.setText(`ANIME SURVIVOR  |  HP ${this.hp}/${PLAYER.maxHealth}  |  LV ${this.level}  XP ${this.xp}/${xpThreshold(this.level)}\nTIME ${minutes}:${seconds}  |  KILLS ${this.defeated}`);
  }
}
