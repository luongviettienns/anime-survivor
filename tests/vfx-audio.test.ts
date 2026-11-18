import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSaveData } from '../src/domain/storageSchema';
import { AudioSystem } from '../src/game/systems/AudioSystem';
import { saveSaveData, updateSettings } from '../src/game/systems/StorageSystem';
import { createMockVfxScene } from './helpers/vfxScene';
import { VfxSystem } from '../src/game/systems/VfxSystem';

function createMockAudioScene(opts?: { audioExists?: boolean; throwOnPlay?: boolean }) {
  const playMock = vi.fn(() => {
    if (opts?.throwOnPlay) throw new Error('AudioContext locked');
    return true;
  });
  const existsMock = vi.fn(() => opts?.audioExists ?? true);
  const scene = {
    time: { now: 1000 },
    cache: { audio: { exists: existsMock } },
    sound: { play: playMock },
  } as unknown as Phaser.Scene;
  return { scene, playMock, existsMock };
}

describe('AudioSystem', () => {
  beforeEach(() => {
    saveSaveData(createDefaultSaveData());
  });

  it('plays sound cues with configured volume and tracks played counts', () => {
    const { scene, playMock } = createMockAudioScene();
    const audio = new AudioSystem(scene);

    expect(audio.play('hit', 100)).toBe(true);
    expect(playMock).toHaveBeenCalledWith('sfx-hit', { volume: 0.7 });
    expect(audio.getPlayedCounts().hit).toBe(1);
  });

  it('debounces identical cues within 45ms window while allowing distinct cues', () => {
    const { scene, playMock } = createMockAudioScene();
    const audio = new AudioSystem(scene);

    expect(audio.play('hit', 1000)).toBe(true);
    expect(audio.play('hit', 1020)).toBe(false);
    expect(audio.play('hit', 1044)).toBe(false);
    expect(audio.play('shoot', 1020)).toBe(true);
    expect(audio.play('hit', 1045)).toBe(true);

    expect(playMock).toHaveBeenCalledTimes(3);
    expect(audio.getPlayedCounts()).toEqual({
      shoot: 1,
      slash: 0,
      hit: 2,
      pickup: 0,
      levelup: 0,
      hurt: 0,
    });
  });

  it('respects muted and zero-volume settings and catches browser audio errors safely', () => {
    const { scene, playMock } = createMockAudioScene({ throwOnPlay: true });
    const audio = new AudioSystem(scene);

    expect(() => audio.play('levelup', 200)).not.toThrow();
    expect(audio.getPlayedCounts().levelup).toBe(1);

    updateSettings({ muted: true });
    expect(audio.play('levelup', 500)).toBe(false);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(audio.getPlayedCounts().levelup).toBe(1);
  });
});

describe('VfxSystem', () => {
  beforeEach(() => {
    saveSaveData(createDefaultSaveData());
  });

  it('pre-allocates particle reserve(48) and 24 pooled damage texts without runtime allocations', () => {
    const { scene, reserveMock, explodeMock, createdTexts } = createMockVfxScene();
    const vfx = new VfxSystem(scene, { x: 400, y: 300 });

    expect(reserveMock).toHaveBeenCalledWith(48);
    expect(createdTexts).toHaveLength(24);
    expect(vfx.getActiveDamageTexts()).toBe(0);

    for (let i = 0; i < 30; i++) {
      vfx.emitHit(100 + i, 200, 18, i % 5 === 0);
    }
    expect(createdTexts).toHaveLength(24);
    expect(vfx.getActiveDamageTexts()).toBe(24);
    expect(explodeMock).toHaveBeenCalledTimes(30);

    vfx.update(690, 190);
    expect(vfx.getActiveDamageTexts()).toBe(24);

    vfx.update(900, 210);
    expect(vfx.getActiveDamageTexts()).toBe(0);
  });

  it('respects reduceFlashing and reduceScreenShake accessibility settings', () => {
    const { scene, flashMock, shakeMock, explodeMock } = createMockVfxScene();
    const vfx = new VfxSystem(scene, { x: 250, y: 260 });

    vfx.onLevelUp();
    vfx.onPlayerHurt();
    expect(explodeMock).toHaveBeenCalledWith(16, 250, 260);
    expect(flashMock).toHaveBeenCalledWith(160, 130, 90, 200);
    expect(shakeMock).toHaveBeenCalledWith(120, 0.006);

    updateSettings({ reduceFlashing: true, reduceScreenShake: true });
    vfx.onLevelUp();
    vfx.onPlayerHurt();
    expect(flashMock).toHaveBeenCalledTimes(1);
    expect(shakeMock).toHaveBeenCalledTimes(1);
  });
});
