import type Phaser from 'phaser';
import { ART_SCALE } from '../config/artDisplay';
import { loadSaveData } from './StorageSystem';
import { VfxPool } from './VfxPool';
import { DamageTextPool } from './DamageTextPool';

export class VfxSystem {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly damageText: DamageTextPool;
  private readonly vfxPool: VfxPool;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player?: { x: number; y: number }
  ) {
    this.emitter = this.scene.add.particles(0, 0, 'rasengan', {
      frame: 0,
      emitting: false,
      lifespan: 240,
      speed: { min: 45, max: 135 },
      scale: { start: 12 / 192, end: 0 },
      alpha: { start: 0.82, end: 0 },
    });
    this.emitter.setDepth(500_000_000);
    this.emitter.reserve(48);
    this.vfxPool = new VfxPool(scene);

    this.damageText = new DamageTextPool(scene);
  }

  spawnDamageText(x: number, y: number, amount: number, nowMs = this.scene.time.now, critical = false, explosive = false): void {
    this.damageText.spawnDamageText(x, y, amount, nowMs, critical, explosive);
  }

  emitHit(x: number, y: number, damage: number, killed = false, critical = false, explosive = false): void {
    this.spawnDamageText(x, y, damage, this.scene.time?.now ?? 0, critical, explosive);
    this.emitter.explode(killed ? 8 : 3, x, y);
    this.vfxPool.playOneShot('vfx_hit', 'vfx-hit-burst', x, y, {
      scale: critical ? 1.5 : 1.0,
      rotation: Math.random() * Math.PI * 2,
      depth: 500_000_220,
      alpha: critical ? 0.92 : 0.85,
      additive: critical,
    });
    if (killed) {
      this.vfxPool.playOneShot('vfx_death', 'vfx-death-poof', x, y, {
        scale: ART_SCALE.vfx_death ?? 1,
        depth: 500_000_150,
        alpha: 0.84,
      });
    }
    if (critical || killed) {
      const reduceShake = loadSaveData().settings.reduceScreenShake;
      this.vfxPool.addTrauma(critical ? 0.22 : 0.1, reduceShake);
      if (critical && killed) this.vfxPool.triggerHitStop(32, reduceShake);
    }
  }

  playPickupBurst(x: number, y: number, isHeal = false): void {
    this.vfxPool.playOneShot('vfx_hit', 'vfx-hit-burst', x, y, {
      scale: 0.85,
      rotation: Math.random() * Math.PI,
      depth: 500_000_190,
      tint: isHeal ? 0x34d399 : 0x38bdf8,
      alpha: 0.82,
      additive: true,
    });
  }

  playCastFlare(x: number, y: number): void {
    this.vfxPool.playOneShot('rasengan', 'rasengan-charge', x, y, {
      scale: (ART_SCALE.rasengan ?? 0.5) / 2, depth: 500_000_120, alpha: 1, additive: false,
    });
  }

  playRasenganHit(x: number, y: number): void {
    this.vfxPool.playOneShot('rasengan', 'rasengan-hit', x, y,
      { scale: (ART_SCALE.rasengan ?? 0.5) * 2, depth: 500_000_210, alpha: 1 });
  }

  playPunch(x: number, y: number, flipX = false): void {
    this.vfxPool.playOneShot('punch', 'punch-hit', x, y,
      { scale: (ART_SCALE.punch ?? 1) * 2, flipX, depth: 500_000_180, alpha: 1 });
  }

  playExplosion(x: number, y: number, radiusPx: number): void {
    const scale = Math.max(2, Math.round(radiusPx / 30));
    this.vfxPool.playOneShot('explosion', 'explosion-boom', x, y, {
      scale: scale * (ART_SCALE.explosion ?? 1), depth: 500_000_250, alpha: 1, additive: false,
    });
    this.emitter.explode(12, x, y);
    const reduceShake = loadSaveData().settings.reduceScreenShake;
    this.vfxPool.addTrauma(0.36, reduceShake);
    this.vfxPool.triggerHitStop(36, reduceShake);
  }

  onLevelUp(x?: number, y?: number): void {
    const px = x ?? this.player?.x ?? 0;
    const py = y ?? this.player?.y ?? 0;
    this.emitter.explode(16, px, py);
    this.vfxPool.playOneShot('vfx_levelup', 'vfx-levelup-pillar', px, py - 20, {
      scale: 2.0, depth: 500_000_400, additive: true,
    });
    if (!loadSaveData().settings.reduceFlashing) {
      this.scene.cameras?.main?.flash(160, 130, 90, 200);
    }
  }

  flashLevelUp(): void { this.onLevelUp(); }

  playPlayerSkillHit(x: number, y: number, angle: number, dash: boolean): void {
    this.vfxPool.playOneShot('player_skill_hit', 'player-skill-impact', x, y, {
      scale: 0.42, rotation: angle, depth: 500_000_450,
      tint: dash ? 0xd49bff : 0xffb78e, alpha: 0.95,
    });
  }

  playDualEffect(texture: string, animKey: string, x: number, y: number, scale = 0.05, depth = 500_000_230, rotation = 0): void {
    this.vfxPool.playOneShot(texture, animKey, x, y, { scale, rotation, depth, alpha: 0.95 });
  }

  onPlayerHurt(): void {
    const reduceShake = loadSaveData().settings.reduceScreenShake;
    if (!reduceShake) {
      this.scene.cameras?.main?.shake(120, 0.006);
      this.vfxPool.addTrauma(0.55, false);
    }
  }

  shakePlayerHit(): void { this.onPlayerHurt(); }

  update(nowMs: number, deltaMs: number): void {
    this.vfxPool.update(deltaMs, loadSaveData().settings.reduceScreenShake);
    this.damageText.update(nowMs);
  }

  getActiveDamageTexts(): number { return this.damageText.getActiveCount(); }

  clear(): void {
    this.damageText.clear();
    this.emitter.stop();
    this.vfxPool.clear();
  }
}
