import type Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import type { EnemyArchetypeId } from '../../domain/enemies';
import {
  createPhantomDashState,
  findPhantomDashTargets,
  PHANTOM_DASH,
  stepPhantomDashPosition,
  triggerPhantomDash,
  type PhantomDashState,
} from '../../domain/phantomDash';
import { rollCombatDamage, type PassiveStats } from '../../domain/upgrades';
import type { Vec2 } from '../../domain/vector';
import type { WeaponId } from '../../domain/weapons';
import { dashClip } from '../config/phantomDashAssets';
import type { EnemySystem } from './EnemySystem';
import type { VfxSystem } from './VfxSystem';

type GhostEntry = { sprite: Phaser.GameObjects.Sprite; expiresAtMs: number };

export class PhantomDashSystem {
  private readonly state: PhantomDashState = createPhantomDashState();
  private readonly hitIds = new Set<number>();
  private readonly ghosts: GhostEntry[] = [];
  private active = false;
  private unlocked = false;
  private nextGhostAtMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly vfx?: VfxSystem,
    private readonly onSkillUsed?: (skill: WeaponId, aimX: number, animOverride?: string) => void,
    private readonly onAudioCue?: (cue: 'slash') => void
  ) {}

  tryTrigger(nowMs: number, moveDir: Vec2, lastAim: Vec2, passives: PassiveStats, playerState: PlayerState): boolean {
    if (!passives.phantomDashUnlocked || !this.player.active || !playerState.alive) return false;
    const triggered = triggerPhantomDash(
      this.state,
      { x: this.player.x, y: this.player.y },
      moveDir,
      lastAim,
      nowMs,
      passives.cooldownReductionMs
    );
    if (!triggered) return false;

    this.active = true;
    this.hitIds.clear();
    this.nextGhostAtMs = nowMs;
    playerState.invulnerableUntilMs = Math.max(playerState.invulnerableUntilMs, nowMs + PHANTOM_DASH.iframeMs);

    const animKey = dashClip(this.state.dir).key;
    this.onSkillUsed?.('dual_slash', this.state.dir.x, animKey);
    this.onAudioCue?.('slash');
    this.vfx?.playDualEffect(
      'vfx_dual_element_impact',
      'vfx-dual-element-impact',
      this.player.x,
      this.player.y,
      0.055,
      500_000_235,
      Math.atan2(this.state.dir.y, this.state.dir.x)
    );
    return true;
  }

  update(
    nowMs: number,
    passives: PassiveStats,
    enemies: EnemySystem,
    onHitFeedback?: (x: number, y: number, dmg: number, killed: boolean, critical: boolean) => void,
    onEnemyKilled?: (x: number, y: number, archetype: EnemyArchetypeId, xpValue: number) => void
  ): boolean {
    this.unlocked = passives.phantomDashUnlocked;
    this.updateGhosts(nowMs);
    if (!this.active) return false;

    const pos = stepPhantomDashPosition(this.state, nowMs);
    this.player.setPosition(pos.x, pos.y).setVelocity(0, 0);
    if (nowMs >= this.nextGhostAtMs) {
      this.spawnGhost(nowMs, pos.x, pos.y);
      this.nextGhostAtMs = nowMs + 45;
    }

    const targets = findPhantomDashTargets(this.state.startPos, pos, PHANTOM_DASH.hitRadiusPx, enemies.getCandidates());
    for (const cand of targets) {
      if (this.hitIds.has(cand.id)) continue;
      this.hitIds.add(cand.id);
      const st = enemies.getStatus(cand.sprite);
      const hasStatus = Boolean(st && (nowMs < st.slowUntilMs || nowMs < st.burnUntilMs));
      const baseDmg = PHANTOM_DASH.damage + (hasStatus ? PHANTOM_DASH.statusBonusDamage : 0);
      const rolled = rollCombatDamage(baseDmg, passives);
      const res = enemies.damageEnemy(cand.sprite, rolled.damage, PHANTOM_DASH.knockbackPxSec, this.state.startPos);
      if (res.damaged) {
        this.vfx?.playDualEffect('vfx_dual_element_impact', 'vfx-dual-element-impact', res.x, res.y, 0.048, 500_000_230);
        onHitFeedback?.(res.x, res.y, rolled.damage, res.killed, rolled.critical);
      }
      if (res.killed) onEnemyKilled?.(res.x, res.y, res.archetype, res.xpValue);
    }

    if (!pos.active) this.active = false;
    return this.active;
  }

  getCooldownRemainingMs(nowMs: number): number {
    return Math.max(0, this.state.readyAtMs - nowMs);
  }

  isUnlocked(): boolean { return this.unlocked; }

  isDashing(): boolean {
    return this.active;
  }

  clear(): void {
    this.active = false;
    this.hitIds.clear();
    for (const g of this.ghosts) g.sprite.setActive(false).setVisible(false);
  }

  private spawnGhost(nowMs: number, x: number, y: number): void {
    const clip = dashClip(this.state.dir);
    const frame = `${clip.atlas}/${String(clip.ghostFrame).padStart(3, '0')}`;
    let entry = this.ghosts.find((g) => !g.sprite.active);
    if (!entry) {
      if (this.ghosts.length >= 6) return;
      const sprite = this.scene.add.sprite(x, y, clip.key, frame)
        .setOrigin(0.5, 0.75).setScale(clip.scale);
      entry = { sprite, expiresAtMs: 0 };
      this.ghosts.push(entry);
    }
    const tint = this.ghosts.indexOf(entry) % 2 === 0 ? 0x5ce1e6 : 0xc084fc;
    entry.sprite.setTexture(clip.key, frame).setScale(clip.scale)
      .setPosition(Math.round(x), Math.round(y + 28))
      .setFlipX(false)
      .setTint(tint).setAlpha(0.65).setDepth(y - 1).setActive(true).setVisible(true);
    entry.expiresAtMs = nowMs + 240;
  }

  private updateGhosts(nowMs: number): void {
    for (const g of this.ghosts) {
      if (!g.sprite.active) continue;
      const left = g.expiresAtMs - nowMs;
      if (left <= 0) { g.sprite.setActive(false).setVisible(false); continue; }
      g.sprite.setAlpha((left / 240) * 0.65);
    }
  }
}
