import type Phaser from 'phaser';

export type OneShotOptions = {
  scale?: number;
  rotation?: number;
  depth?: number;
  tint?: number;
  alpha?: number;
  additive?: boolean;
  flipX?: boolean;
};

const POOL_SIZE = 48;
const HIT_STOP_COOLDOWN_MS = 650;

export class VfxPool {
  private readonly sprites: Phaser.GameObjects.Sprite[] = [];
  private cursor = 0;
  private trauma = 0;
  private shakeClock = 0;
  private hitStopId = 0;
  private nextHitStopAllowedMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    if (typeof scene.add?.sprite !== 'function') return;
    for (let i = 0; i < POOL_SIZE; i++) {
      const sp = scene.add.sprite(0, 0, 'vfx_hit', 0).setActive(false).setVisible(false).setDepth(500_000_000);
      sp.on('animationcomplete', () => {
        sp.setActive(false).setVisible(false);
      });
      this.sprites.push(sp);
    }
  }

  playOneShot(texture: string, animKey: string, x: number, y: number, opts?: OneShotOptions): void {
    if (this.sprites.length === 0 || !this.scene.anims?.exists(animKey)) return;
    let sp = this.sprites.find((s) => !s.active);
    if (!sp) {
      sp = this.sprites[this.cursor % this.sprites.length]!;
      this.cursor++;
    }
    sp.setTexture(texture)
      .setPosition(x, y)
      .setScale(opts?.scale ?? 1.5)
      .setRotation(opts?.rotation ?? 0)
      .setFlipX(opts?.flipX ?? false)
      .setDepth(opts?.depth ?? 500_000_000)
      .setAlpha(opts?.alpha ?? 1)
      .setBlendMode(opts?.additive ? 'ADD' : 'NORMAL')
      .setActive(true)
      .setVisible(true);
    if (opts?.tint !== undefined) sp.setTint(opts.tint);
    else sp.clearTint();
    sp.play(animKey);
  }

  addTrauma(amount: number, reduceShake: boolean): void {
    if (reduceShake || !Number.isFinite(amount) || amount <= 0) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  triggerHitStop(durationMs = 36, reduceShake = false): void {
    if (reduceShake || typeof setTimeout === 'undefined') return;
    const realNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (realNow < this.nextHitStopAllowedMs) return;
    this.nextHitStopAllowedMs = realNow + HIT_STOP_COOLDOWN_MS;
    const myId = ++this.hitStopId;
    if (this.scene.anims) this.scene.anims.globalTimeScale = 0.25;
    setTimeout(() => {
      if (myId === this.hitStopId && this.scene.anims) {
        this.scene.anims.globalTimeScale = 1;
      }
    }, durationMs);
  }

  update(deltaMs: number, reduceShake: boolean): void {
    const cam = this.scene.cameras?.main;
    if (!cam || typeof cam.setFollowOffset !== 'function') return;
    if (reduceShake || this.trauma <= 0) {
      if (this.trauma > 0) this.trauma = 0;
      cam.setFollowOffset(0, 0);
      return;
    }
    const realDt = Math.min(0.05, Math.max(0.001, deltaMs / 1000));
    this.trauma = Math.max(0, this.trauma - 2.4 * realDt);
    const shake = this.trauma * this.trauma;
    this.shakeClock += realDt * 42;
    cam.setFollowOffset(
      Math.round(10 * shake * Math.sin(this.shakeClock * 1.7)),
      Math.round(7 * shake * Math.sin(this.shakeClock * 2.3))
    );
    if (this.trauma === 0) cam.setFollowOffset(0, 0);
  }

  clear(): void {
    this.trauma = 0;
    this.hitStopId++;
    if (this.scene.anims) this.scene.anims.globalTimeScale = 1;
    this.scene.cameras?.main?.setFollowOffset?.(0, 0);
    for (const sp of this.sprites) {
      sp.anims?.stop();
      sp.setActive(false).setVisible(false);
    }
  }
}
