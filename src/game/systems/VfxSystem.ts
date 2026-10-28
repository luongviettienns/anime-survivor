import type Phaser from 'phaser';
import { loadSaveData } from './StorageSystem';

type DamageTextSlot = {
  text: Phaser.GameObjects.Text;
  active: boolean;
  bornAtMs: number;
};

const DAMAGE_POOL_SIZE = 24;
const DAMAGE_TEXT_LIFE_MS = 380;

export class VfxSystem {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly damagePool: DamageTextSlot[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player?: { x: number; y: number }
  ) {
    this.emitter = this.scene.add.particles(0, 0, 'orb', {
      emitting: false,
      lifespan: 260,
      speed: { min: 40, max: 140 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
    });
    this.emitter.setDepth(6000);
    this.emitter.reserve(48);

    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      const text = this.scene.add
        .text(0, 0, '0', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#fef08a',
          stroke: '#0f172a',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(6500)
        .setActive(false)
        .setVisible(false);
      this.damagePool.push({ text, active: false, bornAtMs: 0 });
    }
  }

  spawnDamageText(
    x: number,
    y: number,
    amount: number,
    nowMs: number = this.scene.time?.now ?? 0
  ): void {
    let slot = this.damagePool.find((s) => !s.active);
    if (!slot) {
      slot = this.damagePool[0]!;
      for (const candidate of this.damagePool) {
        if (candidate.bornAtMs < slot.bornAtMs) slot = candidate;
      }
    }
    slot.active = true;
    slot.bornAtMs = nowMs;
    slot.text
      .setText(String(Math.max(1, Math.round(amount))))
      .setPosition(x, y - 12)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);
  }

  emitHit(x: number, y: number, damage: number, killed = false): void {
    this.spawnDamageText(x, y, damage, this.scene.time?.now ?? 0);
    this.emitter.explode(killed ? 10 : 4, x, y);
  }

  onLevelUp(x?: number, y?: number): void {
    const px = x ?? this.player?.x ?? 0;
    const py = y ?? this.player?.y ?? 0;
    this.emitter.explode(16, px, py);
    if (!loadSaveData().settings.reduceFlashing) {
      this.scene.cameras?.main?.flash(160, 130, 90, 200);
    }
  }

  flashLevelUp(): void {
    this.onLevelUp();
  }

  onPlayerHurt(): void {
    if (!loadSaveData().settings.reduceScreenShake) {
      this.scene.cameras?.main?.shake(120, 0.006);
    }
  }

  shakePlayerHit(): void {
    this.onPlayerHurt();
  }

  update(nowMs: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const slot of this.damagePool) {
      if (!slot.active) continue;
      const age = nowMs - slot.bornAtMs;
      if (age >= DAMAGE_TEXT_LIFE_MS) {
        slot.active = false;
        slot.text.setActive(false).setVisible(false);
        continue;
      }
      slot.text.y -= 35 * dt;
      slot.text.setAlpha(1 - age / DAMAGE_TEXT_LIFE_MS);
    }
  }

  getActiveDamageTexts(): number {
    let count = 0;
    for (const slot of this.damagePool) {
      if (slot.active) count++;
    }
    return count;
  }

  clear(): void {
    for (const slot of this.damagePool) {
      slot.active = false;
      slot.text.setActive(false).setVisible(false);
    }
    this.emitter.stop();
  }
}
