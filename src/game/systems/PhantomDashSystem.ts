import type Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import type { EnemyArchetypeId } from '../../domain/enemies';
import {
  canTriggerPhantomDash,
  createPhantomDashState,
  findPhantomDashTargets,
  getPhantomDashStats,
  PHANTOM_DASH,
  stepPhantomDashPosition,
  triggerAutoPhantomDash,
  type PhantomDashState,
} from '../../domain/phantomDash';
import { rollCombatDamage, type PassiveStats } from '../../domain/upgrades';
import type { WeaponId } from '../../domain/weapons';
import { dashClip } from '../config/phantomDashAssets';
import type { EnemySystem } from './EnemySystem';
import type { VfxSystem } from './VfxSystem';

type GhostEntry = { sprite: Phaser.GameObjects.Sprite; expiresAtMs: number };

export class PhantomDashSystem {
  private readonly state: PhantomDashState = createPhantomDashState();
  private readonly stepHitIds = new Set<number>();
  private readonly chainHitIds = new Set<number>();
  private readonly ghosts: GhostEntry[] = [];
  private active = false;
  private level = 0;
  private remainingChain = 0;
  private nextGhostAtMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly vfx?: VfxSystem,
    private readonly onSkillUsed?: (skill: WeaponId, aimX: number, animOverride?: string) => void,
    private readonly onAudioCue?: (cue: 'slash') => void
  ) {}

  update(
    nowMs: number,
    passives: PassiveStats,
    enemies: EnemySystem,
    playerState: PlayerState,
    onHitFeedback?: (x: number, y: number, dmg: number, killed: boolean, critical: boolean) => void,
    onEnemyKilled?: (x: number, y: number, archetype: EnemyArchetypeId, xpValue: number) => void
  ): boolean {
    this.level = passives.phantomDashLevel;
    this.updateGhosts(nowMs);
    if (this.level <= 0 || !this.player.active || !playerState.alive) {
      this.active = false;
      return false;
    }

    const candidates = enemies.getCandidates();
    if (!this.active) {
      if (!canTriggerPhantomDash(this.state, nowMs)) return false;
      this.chainHitIds.clear();
      const stats = getPhantomDashStats(this.level);
      if (!this.startStep(nowMs, candidates, passives, playerState, true)) return false;
      this.remainingChain = stats.dashCount - 1;
    }

    const stats = getPhantomDashStats(this.level);
    const pos = stepPhantomDashPosition(this.state, nowMs);
    this.player.setPosition(pos.x, pos.y).setVelocity(0, 0);
    if (nowMs >= this.nextGhostAtMs) {
      this.spawnGhost(nowMs, pos.x, pos.y);
      this.nextGhostAtMs = nowMs + 45;
    }

    const spotsLeft = Math.max(0, stats.pierceCount - this.stepHitIds.size);
    if (spotsLeft > 0) {
      const targets = findPhantomDashTargets(this.state.startPos, pos, PHANTOM_DASH.hitRadiusPx, candidates, stats.pierceCount);
      for (const cand of targets) {
        if (this.stepHitIds.size >= stats.pierceCount) break;
        if (this.stepHitIds.has(cand.id)) continue;
        this.stepHitIds.add(cand.id);
        this.chainHitIds.add(cand.id);
        const st = enemies.getStatus(cand.sprite);
        const hasStatus = Boolean(st && (nowMs < st.slowUntilMs || nowMs < st.burnUntilMs));
        const baseDmg = stats.damage + (hasStatus ? PHANTOM_DASH.statusBonusDamage : 0);
        const rolled = rollCombatDamage(baseDmg, passives);
        const res = enemies.damageEnemy(cand.sprite, rolled.damage, PHANTOM_DASH.knockbackPxSec, this.state.startPos);
        if (res.damaged) {
          this.vfx?.playDualEffect('vfx_dual_element_impact', 'vfx-dual-element-impact', res.x, res.y, 0.048, 500_000_230);
          onHitFeedback?.(res.x, res.y, rolled.damage, res.killed, rolled.critical);
        }
        if (res.killed) onEnemyKilled?.(res.x, res.y, res.archetype, res.xpValue);
      }
    }

    if (!pos.active) {
      if (this.remainingChain > 0 && this.startStep(nowMs, enemies.getCandidates(), passives, playerState, false)) {
        this.remainingChain -= 1;
      } else {
        this.active = false;
        this.remainingChain = 0;
      }
    }
    return this.active;
  }

  getCooldownRemainingMs(nowMs: number): number { return Math.max(0, this.state.readyAtMs - nowMs); }
  getLevel(): number { return this.level; }
  isUnlocked(): boolean { return this.level > 0; }
  isDashing(): boolean { return this.active; }

  clear(): void {
    this.active = false;
    this.remainingChain = 0;
    this.stepHitIds.clear();
    this.chainHitIds.clear();
    for (const g of this.ghosts) g.sprite.setActive(false).setVisible(false);
  }

  private startStep(
    nowMs: number,
    candidates: ReturnType<EnemySystem['getCandidates']>,
    passives: PassiveStats,
    playerState: PlayerState,
    startCooldown: boolean
  ): boolean {
    const triggered = triggerAutoPhantomDash(
      this.state, { x: this.player.x, y: this.player.y }, candidates,
      this.level, nowMs, passives.cooldownReductionMs, startCooldown, this.chainHitIds
    );
    if (!triggered) return false;
    this.active = true;
    this.stepHitIds.clear();
    this.nextGhostAtMs = nowMs;
    playerState.invulnerableUntilMs = Math.max(playerState.invulnerableUntilMs, nowMs + PHANTOM_DASH.iframeMs);
    this.onSkillUsed?.('dual_slash', this.state.dir.x, dashClip(this.state.dir).key);
    this.onAudioCue?.('slash');
    this.vfx?.playDualEffect(
      'vfx_dual_element_impact', 'vfx-dual-element-impact',
      this.player.x, this.player.y, 0.055, 500_000_235, Math.atan2(this.state.dir.y, this.state.dir.x)
    );
    return true;
  }

  private spawnGhost(nowMs: number, x: number, y: number): void {
    const clip = dashClip(this.state.dir);
    const frame = `${clip.atlas}/${String(clip.ghostFrame).padStart(3, '0')}`;
    let entry = this.ghosts.find((g) => !g.sprite.active);
    if (!entry) {
      if (this.ghosts.length >= 6) return;
      const sprite = this.scene.add.sprite(x, y, clip.key, frame).setOrigin(0.5, 0.75).setScale(clip.scale);
      entry = { sprite, expiresAtMs: 0 };
      this.ghosts.push(entry);
    }
    const tint = this.ghosts.indexOf(entry) % 2 === 0 ? 0x5ce1e6 : 0xc084fc;
    entry.sprite.setTexture(clip.key, frame).setScale(clip.scale).setPosition(Math.round(x), Math.round(y + 28))
      .setFlipX(false).setTint(tint).setAlpha(0.65).setDepth(y - 1).setActive(true).setVisible(true);
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
