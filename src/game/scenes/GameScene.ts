import Phaser from 'phaser';
import type { EnemyArchetypeId } from '../../domain/enemies';
import { getHeroConfig, type HeroConfig, type HeroId } from '../../domain/heroes';
import { SPAWN_ORIGIN_X, SPAWN_ORIGIN_Y } from '../../domain/infiniteMap';
import { computeEliteDrops, computeKillDrops } from '../../domain/pickups';
import { applyXpGain, createProgression, type RunProgression } from '../../domain/progression';
import { createPassiveStats, type PassiveStats, type UpgradeChoice } from '../../domain/upgrades';
import { isRunVictory } from '../../domain/waves';
import { HudOverlay } from '../../ui/HudOverlay';
import { PICKUP, PLAYER, WORLD } from '../config/constants';
import { AudioSystem, type SoundCue } from '../systems/AudioSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { registerGameDebugApi } from '../systems/DebugBridge';
import type { EnemyImpact } from '../systems/EnemyMeleeSkill';
import { EnemySystem } from '../systems/EnemySystem';
import { GroundShadows } from '../systems/GroundShadows';
import { InfiniteMapSystem } from '../systems/InfiniteMapSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PhantomDashSystem } from '../systems/PhantomDashSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { VfxSystem } from '../systems/VfxSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import type { UpgradeScene } from './UpgradeScene';

type OverlapObj = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private map!: InfiniteMapSystem;
  private enemies!: EnemySystem;
  private weapon!: WeaponSystem;
  private movement!: MovementSystem;
  private damage!: DamageSystem;
  private pickups!: PickupSystem;
  private vfx!: VfxSystem;
  private audio!: AudioSystem;
  private shadows!: GroundShadows;
  private hud!: HudOverlay;
  private phantomDash?: PhantomDashSystem;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private heroConfig: HeroConfig = getHeroConfig('naruto');
  private progression: RunProgression = createProgression();
  private passives: PassiveStats = createPassiveStats();
  private defeated = 0;
  private normalKills = 0;
  private eliteKills = 0;
  private elapsed = 0;
  private running = false;
  private lastPauseEventTs = -1;

  constructor() { super('GameScene'); }

  create(data?: { heroId?: HeroId }): void {
    this.heroConfig = getHeroConfig(data?.heroId);
    this.progression = createProgression(); this.passives = createPassiveStats();
    this.defeated = 0; this.normalKills = 0; this.eliteKills = 0; this.elapsed = 0; this.running = true;
    this.map = new InfiniteMapSystem(this);
    this.player = this.physics.add.sprite(SPAWN_ORIGIN_X, SPAWN_ORIGIN_Y, 'hero', 0);
    this.player.setScale(2).setCollideWorldBounds(false).setDepth(5000).setCircle(10, 6, 13).play('hero-idle');
    this.cameras.main.setZoom(1.3);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.map.update(this.player.x, this.player.y);
    this.movement = new MovementSystem(this, this.player, this.heroConfig.id, this.heroConfig.moveSpeed);
    this.vfx = new VfxSystem(this, this.player);
    this.enemies = new EnemySystem(this, this.player, this.vfx);
    this.audio = new AudioSystem(this);
    this.weapon = new WeaponSystem(
      this, this.player, this.enemies,
      (x, y, arch, xp) => this.onEnemyKilled(x, y, arch, xp),
      (c, x, y, d, k, crit, boom) => this.onCombat(c, x, y, d, k, crit, boom),
      this.vfx, (skill, aimX, anim) => this.movement.playSkill(skill, aimX, anim),
      this.heroConfig.startingWeaponId
    );
    this.damage = new DamageSystem(this.player, this.heroConfig.maxHp, this.heroConfig.armor, this.heroConfig.invulnerabilityMs);
    this.pickups = new PickupSystem(this);
    this.hud = new HudOverlay(this, this.heroConfig.id); this.shadows = new GroundShadows(this, this.player, this.enemies.group, this.pickups.group);
    this.phantomDash = this.heroConfig.id === 'kirito'
      ? new PhantomDashSystem(this, this.player, this.vfx, (s, x, a) => this.movement.playSkill(s, x, a), (c) => this.onCombat(c))
      : undefined;
    this.physics.add.overlap(this.weapon.projectiles, this.enemies.group, (a, b) => this.weapon.handleProjectileHit(a as Phaser.GameObjects.GameObject, b as Phaser.GameObjects.GameObject));
    this.physics.add.overlap(this.player, this.enemies.group, (_p, e) => this.onPlayerEnemyContact(e));
    this.physics.add.overlap(this.player, this.pickups.group, (_p, item) => this.onPlayerPickup(item));
    this.spawnTimer = this.time.addEvent({ delay: 60_000, loop: true });
    const onPauseKey = (ev?: KeyboardEvent) => this.handlePauseKey(ev?.timeStamp);
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', onPauseKey); kb?.on('keydown-P', onPauseKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb?.off('keydown-ESC', onPauseKey); kb?.off('keydown-P', onPauseKey); this.cleanup();
    });
    registerGameDebugApi(this, this.player, this.damage, this.enemies, this.weapon, this.pickups, this.vfx, this.audio, this.map, () => ({ ...this.progression, defeated: this.defeated }), this.phantomDash);
    this.updateHud();
  }
  update(_now: number, delta: number): void {
    if (!this.running || !this.damage.state.alive) return;
    this.elapsed += delta / 1000;
    if (this.elapsed >= WORLD.runDurationSec) this.enemies.ensureBossSpawned();
    if (!this.spawnTimer?.paused) this.enemies.stepWaves(delta, this.elapsed, this.player.body?.velocity);
    const dashing = this.phantomDash?.update(this.time.now, this.passives, this.enemies, this.damage.state,
      (x, y, dmg, killed, crit) => this.onCombat('hit', x, y, dmg, killed, crit), (x, y, arch, xp) => this.onEnemyKilled(x, y, arch, xp), !this.movement.isSwordBusy()) ?? false;
    if (dashing) this.movement.syncDashVisual(); else this.movement.update(true, this.passives.moveSpeedBonusPxSec, delta);
    this.map.update(this.player.x, this.player.y);
    this.enemies.update(false, (dmg, impact) => this.applyPlayerHit(dmg, impact), delta, (bx, by, dmg, killed, arch, xp) => {
      this.onCombat('hit', bx, by, dmg, killed);
      if (killed) this.onEnemyKilled(bx, by, arch, xp);
    });
    this.weapon.update(this.time.now, true, this.passives, dashing || this.movement.isDashVisualActive() || this.movement.isSwordBusy());
    this.pickups.update(this.player, this.heroConfig.magnetRadius + this.passives.pickupRadiusBonusPx, PLAYER.pickupMagnetSpeed);
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
  private onCombat(cue: SoundCue, x?: number, y?: number, dmg?: number, killed?: boolean, critical?: boolean, explosive?: boolean): void {
    this.audio.play(cue);
    if (cue === 'hit' && x !== undefined && y !== undefined && dmg !== undefined) this.vfx.emitHit(x, y, dmg, killed, critical, explosive);
  }
  private triggerLevelUp(): void { this.vfx.onLevelUp(); this.audio.play('levelup'); this.openUpgradeModalIfNeeded(); }
  private onEnemyKilled(x: number, y: number, archetype: EnemyArchetypeId = 'slime', xpValue: number = PICKUP.xpPerKill): void {
    this.defeated++; this.pickups.spawnXpGem(x, y, xpValue);
    if (archetype === 'elite') {
      this.eliteKills++;
      for (const drop of computeEliteDrops(this.eliteKills)) {
        if (drop === 'heal') this.pickups.spawnHealPickup(x + 12, y, PICKUP.healAmount);
        else this.pickups.spawnMagnetPickup(x - 12, y);
      }
    } else if (archetype !== 'boss') {
      this.normalKills++;
      for (const drop of computeKillDrops(this.normalKills)) {
        if (drop === 'heal') this.pickups.spawnHealPickup(x + 12, y, PICKUP.healAmount);
        else this.pickups.spawnMagnetPickup(x - 12, y);
      }
    }
    if (isRunVictory(archetype, true)) this.endRun(true);
  }
  private onPlayerEnemyContact(enemyObj: OverlapObj): void { this.applyPlayerHit(this.enemies.getTouchDamage(enemyObj as Phaser.GameObjects.GameObject)); }
  private applyPlayerHit(damage: number, impact?: EnemyImpact): void {
    if (!this.running || !this.damage.state.alive) return;
    const res = this.damage.tryContactDamage(this.time.now, damage, this.passives.damageReduction);
    if (res.damaged) {
      this.vfx.onPlayerHurt(); this.audio.play('hurt');
      if (impact) {
        const dir = impact.direction;
        this.vfx.playPlayerSkillHit(this.player.x, this.player.y, Math.atan2(dir.y, dir.x), impact.kind === 'dash');
        this.movement.applyKnockback(dir, impact.kind === 'boss_slash' ? 280 : impact.kind === 'slam' ? 240 : 180);
      }
    }
    if (res.died) this.endRun(false);
  }
  private onPlayerPickup(pickupObj: OverlapObj): void {
    if (!this.running || !this.damage.state.alive) return;
    const item = pickupObj as Phaser.Physics.Arcade.Sprite;
    const px = item.x, py = item.y;
    const res = this.pickups.collect(item, this.damage.state, this.progression);
    if (!res.collected) return;
    if (res.type === 'magnet') this.pickups.activateGlobalMagnet();
    this.vfx.playPickupBurst(px, py, res.type === 'heal');
    this.audio.play('pickup');
    if (res.levelsGained > 0) this.triggerLevelUp();
  }
  private openUpgradeModalIfNeeded(): void {
    if (!this.running || this.progression.pendingUpgrades <= 0 || this.scene.isActive('UpgradeScene')) return;
    this.movement.update(false); this.updateHud(); this.scene.pause();
    this.scene.launch('UpgradeScene', { heroId: this.heroConfig.id, inventory: this.weapon.inventory, playerState: this.damage.state, passives: this.passives, progression: this.progression, onApplied: () => this.updateHud() });
  }
  private endRun(victory: boolean): void {
    if (!this.running) return;
    this.running = false; this.movement.update(false); this.enemies.update(true);
    const finish = () => this.scene.start('GameOverScene', { victory, score: this.defeated, survivalSec: Math.floor(this.elapsed), heroId: this.heroConfig.id });
    if (victory) this.time.delayedCall(500, finish);
    else if (!this.movement.playDefeat(finish)) finish();
  }
  private cleanup(): void {
    this.running = false; this.spawnTimer?.remove(false);
    if (this.scene.isActive('UpgradeScene')) this.scene.stop('UpgradeScene');
    if (this.scene.isActive('PauseScene')) this.scene.stop('PauseScene');
    this.phantomDash?.clear(); this.weapon.clear(); this.enemies.clear(); this.pickups.clear(); this.vfx.clear(); this.map.clear(); this.hud.destroy(); this.shadows.clear();
  }
  private updateHud(): void {
    const dashLevel = this.passives.phantomDashLevel;
    this.hud.update({ player: this.damage.state, progression: this.progression, elapsedSec: this.elapsed, defeated: this.defeated, weapons: this.weapon.inventory, passives: this.passives, bossHp: this.enemies.getActiveBossState(), dashLevel: dashLevel > 0 ? dashLevel : undefined, dashCooldownMs: dashLevel > 0 ? this.phantomDash?.getCooldownRemainingMs(this.time.now) : undefined });
  }
}
