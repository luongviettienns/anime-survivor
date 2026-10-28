import type Phaser from 'phaser';
import { loadSaveData } from './StorageSystem';

export type SoundCue = 'shoot' | 'slash' | 'hit' | 'pickup' | 'levelup' | 'hurt';

const CUES: readonly SoundCue[] = ['shoot', 'slash', 'hit', 'pickup', 'levelup', 'hurt'];

export class AudioSystem {
  private readonly minIntervalMs = 45;
  private readonly lastPlayedAt: Record<SoundCue, number> = {
    shoot: Number.NEGATIVE_INFINITY,
    slash: Number.NEGATIVE_INFINITY,
    hit: Number.NEGATIVE_INFINITY,
    pickup: Number.NEGATIVE_INFINITY,
    levelup: Number.NEGATIVE_INFINITY,
    hurt: Number.NEGATIVE_INFINITY,
  };
  private readonly playedCounts: Record<SoundCue, number> = {
    shoot: 0,
    slash: 0,
    hit: 0,
    pickup: 0,
    levelup: 0,
    hurt: 0,
  };

  constructor(private readonly scene: Phaser.Scene) {}

  play(cue: SoundCue, nowMs?: number): boolean {
    const now =
      nowMs ??
      this.scene.time?.now ??
      (typeof performance !== 'undefined' ? performance.now() : 0);
    if (now - this.lastPlayedAt[cue] < this.minIntervalMs) return false;

    const { muted, volume } = loadSaveData().settings;
    if (muted || volume <= 0) return false;

    this.lastPlayedAt[cue] = now;
    this.playedCounts[cue] += 1;

    const key = `sfx-${cue}`;
    try {
      if (this.scene.cache?.audio?.exists(key)) {
        this.scene.sound?.play(key, { volume });
      }
    } catch {
      // Safe no-op when headless browser audio context is locked or unavailable
    }
    return true;
  }

  getPlayedCounts(): Record<SoundCue, number> {
    const copy = {} as Record<SoundCue, number>;
    for (const cue of CUES) copy[cue] = this.playedCounts[cue];
    return copy;
  }
}
