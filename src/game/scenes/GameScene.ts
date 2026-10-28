import Phaser from 'phaser';
import type { EnemyArchetypeId } from '../../domain/enemies';
import { applyXpGain, createProgression, type RunProgression } from '../../domain/progression';
import { createPassiveStats, type PassiveStats, type UpgradeChoice } from '../../domain/upgrades';
import { isRunVictory } from '../../domain/waves';
import { HudOverlay } from '../../ui/HudOverlay';
import { PICKUP, PLAYER, WORLD } from '../config/constants';
import { AudioSystem, type SoundCue } from '../systems/AudioSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { registerGameDebugApi } from '../systems/DebugBridge';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { VfxSystem } from '../systems/VfxSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import type { UpgradeScene } from './UpgradeScene';

type OverlapObj = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: EnemySystem;
  private weapon!: WeaponSystem;
  private movement!: MovementSystem;
  private damage!: DamageSystem;
  private pickups!: PickupSystem;
  private vfx!: VfxSystem;
  private audio!: AudioSystem;
  private hud!: HudOverlay;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private progression: RunProgression = createProgression();
  private passives: PassiveStats = createPassiveStats();
  private defeated = 0;
  private elapsed = 0;
  private running = false;
  private lastPauseEventTs = -1;

  constructor() { super('GameScene'); }

  create(): void {
    this.progression = createProgression(); this.passives = createPassiveStats();
    this.defeated = 0; this.elapsed = 0; this.running = true;
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0);
    this.createScenery();

    this.player = this.physics.add.sprite(WORLD.width / 2, WORLD.height / 2, 'hero', 0);
    this.player.setScale(2).setCollideWorldBounds(true).setDepth(5000).setCircle(10, 6, 13).play('hero-idle');
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height).startFollow(this.player, true, 0.12, 0.12);

    this.movement = new MovementSystem(this, this.player);
    this.enemies = new EnemySystem(this, this.player);
    this.vfx = new VfxSystem(this, this.player);
    this.audio = new AudioSystem(this);
    this.weapon = new WeaponSystem(this, this.player, this.enemies, (x, y, arch, xp) => this.onEnemyKilled(x, y, arch, xp), (c, x, y, d, k) => this.onCombat(c, x, y, d, k));
    this.damage = new DamageSystem(this.player);
    this.pickups = new PickupSystem(this);
    this.hud = new HudOverlay(this);

    this.physics.add.overlap(this.weapon.projectiles, this.enemies.group, (a, b) => this.weapon.handleProjectileHit(a as Phaser.GameObjects.GameObject, b as Phaser.GameObjects.GameObject));
    this.physics.add.overlap(this.player, this.enemies.group, (_p, e) => this.onPlayerEnemyContact(e));
    this.physics.add.overlap(this.player, this.pickups.group, (_p, item) => this.onPlayerPickup(item));
    this.spawnTimer = this.time.addEvent({ delay: 1050, loop: true, callback: () => { if (this.running) this.enemies.spawnWaveTick(this.elapsed); } });

    const onPauseKey = (ev?: KeyboardEvent) => this.handlePauseKey(ev?.timeStamp);
    this.input.keyboard?.on('keydown-ESC', onPauseKey); this.input.keyboard?.on('keydown-P', onPauseKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.keyboard?.off('keydown-ESC', onPauseKey); this.input.keyboard?.off('keydown-P', onPauseKey); this.cleanup(); });
    registerGameDebugApi(this, this.player, this.damage, this.enemies, this.weapon, this.pickups, this.vfx, this.audio, () => ({ ...this.progression, defeated: this.defeated }));
    this.updateHud();
  }

  update(_now: number, delta: number): void {
    if (!this.running || !this.damage.state.alive) return;
    this.elapsed += delta / 1000;
    if (this.elapsed >= WORLD.runDurationSec) this.enemies.ensureBossSpawned();
    this.movement.update(true, this.passives.moveSpeedMultiplier);
    this.enemies.update(false, (dmg) => this.applyPlayerHit(dmg));
    this.weapon.update(this.time.now, true);
    this.pickups.update(this.player, PLAYER.pickupMagnetRadius + this.passives.pickupRadiusBonusPx, PLAYER.pickupMagnetSpeed);
    this.damage.updateVisuals(this.time.now); this.vfx.update(this.time.now, delta);
    this.player.setDepth(this.player.y); this.openUpgradeModalIfNeeded(); this.updateHud();
  }

  getHudText(): string { return this.hud.getStatusText(); }
  getUpgradeChoices(): UpgradeChoice[] { return this.scene.isActive('UpgradeScene') ? (this.scene.get('UpgradeScene') as UpgradeScene).getChoices() : []; }
  chooseUpgrade(index: number): boolean { return this.scene.isActive('UpgradeScene') ? (this.scene.get('UpgradeScene') as UpgradeScene).selectChoice(index) : false; }
  isPaused(): boolean { return this.scene.isPaused('GameScene') || this.scene.isActive('PauseScene'); }

  handlePauseKey(timeStamp?: number): boolean {
    if (timeStamp !== undefined && timeStamp === this.lastPauseEventTs) return this.isPaused();
    if (timeStamp !== undefined) this.lastPauseEventTs = timeStamp;
    return this.togglePause();
  }
  togglePause(): boolean {
    if (!this.running || this.scene.isActive('UpgradeScene')) return false;
    if (this.isPaused()) { this.scene.stop('PauseScene'); this.scene.resume('GameScene'); return false; }
    this.movement.update(false); this.scene.pause('GameScene');
    this.scene.launch('PauseScene', { level: this.progression.level, defeated: this.defeated, elapsedSec: this.elapsed });
    return true;
  }
  grantXp(amount: number): void {
    if (applyXpGain(this.progression, amount).levelsGained > 0) this.triggerLevelUp();
    this.updateHud();
  }

  private onCombat(cue: SoundCue, x?: number, y?: number, dmg?: number, killed?: boolean): void {
    this.audio.play(cue);
    if (cue === 'hit' && x !== undefined && y !== undefined && dmg !== undefined) this.vfx.emitHit(x, y, dmg, killed);
  }
  private triggerLevelUp(): void { this.vfx.onLevelUp(); this.audio.play('levelup'); this.openUpgradeModalIfNeeded(); }
  private createScenery(): void {
    const random = new Phaser.Math.RandomDataGenerator(['anime-survivor-world-v1']);
    for (let i = 0; i < 100; i++) {
      const x = random.between(40, WORLD.width - 40), y = random.between(40, WORLD.height - 40);
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) >= 190) this.add.image(x, y, 'tree').setScale(random.realInRange(1.5, 2.2)).setDepth(y);
    }
  }
  private onEnemyKilled(x: number, y: number, archetype: EnemyArchetypeId = 'slime', xpValue: number = PICKUP.xpPerKill): void {
    this.defeated++; this.pickups.spawnXpGem(x, y, xpValue);
    if (isRunVictory(archetype, true)) this.endRun(true);
  }
  private onPlayerEnemyContact(enemyObj: OverlapObj): void { this.applyPlayerHit(this.enemies.getTouchDamage(enemyObj as Phaser.GameObjects.GameObject)); }
  private applyPlayerHit(damage: number): void {
    if (!this.running || !this.damage.state.alive) return;
    const res = this.damage.tryContactDamage(this.time.now, damage);
    if (res.damaged) { this.vfx.onPlayerHurt(); this.audio.play('hurt'); }
    if (res.died) this.endRun(false);
  }
  private onPlayerPickup(pickupObj: OverlapObj): void {
    if (!this.running || !this.damage.state.alive) return;
    const res = this.pickups.collect(pickupObj as Phaser.GameObjects.GameObject, this.damage.state, this.progression);
    if (!res.collected) return;
    this.audio.play('pickup');
    if (res.levelsGained > 0) this.triggerLevelUp();
  }
  private openUpgradeModalIfNeeded(): void {
    if (!this.running || this.progression.pendingUpgrades <= 0 || this.scene.isActive('UpgradeScene')) return;
    this.movement.update(false); this.updateHud(); this.scene.pause();
    this.scene.launch('UpgradeScene', { inventory: this.weapon.inventory, playerState: this.damage.state, passives: this.passives, progression: this.progression, onApplied: () => this.updateHud() });
  }
  private endRun(victory: boolean): void {
    if (!this.running) return;
    this.running = false; this.movement.update(false); this.enemies.update(true);
    this.scene.start('GameOverScene', { victory, score: this.defeated, survivalSec: Math.floor(this.elapsed) });
  }
  private cleanup(): void {
    this.running = false; this.spawnTimer?.remove(false);
    if (this.scene.isActive('UpgradeScene')) this.scene.stop('UpgradeScene');
    if (this.scene.isActive('PauseScene')) this.scene.stop('PauseScene');
    this.weapon.clear(); this.enemies.clear(); this.pickups.clear(); this.vfx.clear(); this.hud.destroy();
  }
  private updateHud(): void { this.hud.update({ player: this.damage.state, progression: this.progression, elapsedSec: this.elapsed, defeated: this.defeated, weapons: this.weapon.inventory, bossHp: this.enemies.getActiveBossState() }); }
}
