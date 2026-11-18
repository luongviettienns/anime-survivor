import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { createPassiveStats } from '../src/domain/upgrades';
import { CloneSystem } from '../src/game/systems/CloneSystem';
import type { VfxSystem } from '../src/game/systems/VfxSystem';

type MockSprite = {
  x: number; y: number; visible: boolean; destroyed: boolean; flipX: boolean; animKey: string;
  setScale: ReturnType<typeof vi.fn>; setAlpha: ReturnType<typeof vi.fn>; setTint: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>; setFlipX: ReturnType<typeof vi.fn>; setDepth: ReturnType<typeof vi.fn>;
  setVisible: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>;
};

function rig() {
  const sprites: MockSprite[] = [];
  const scene = {
    add: {
      sprite: vi.fn((x: number, y: number) => {
        const s: MockSprite = {
          x, y, visible: true, destroyed: false, flipX: false, animKey: '',
          setScale: vi.fn(() => s), setAlpha: vi.fn(() => s), setTint: vi.fn(() => s),
          setPosition: vi.fn((nx: number, ny: number) => { s.x = nx; s.y = ny; return s; }),
          setFlipX: vi.fn((f: boolean) => { s.flipX = f; return s; }),
          setDepth: vi.fn(() => s),
          setVisible: vi.fn((v: boolean) => { s.visible = v; return s; }),
          play: vi.fn((key: string) => { s.animKey = key; return s; }),
          destroy: vi.fn(() => { s.destroyed = true; }),
        };
        sprites.push(s);
        return s;
      }),
    },
  };
  const player = { x: 0, y: 0, active: true };
  const damage = vi.fn();
  const onCast = vi.fn();
  const onStrike = vi.fn();
  const vfx = { playSmokePoof: vi.fn() };
  const system = new CloneSystem(
    scene as unknown as Phaser.Scene,
    player as unknown as Phaser.Physics.Arcade.Sprite,
    damage,
    onCast,
    onStrike,
    vfx as unknown as VfxSystem
  );
  return { system, sprites, damage, onCast, onStrike, vfx };
}

function cand(id: number, x: number, y: number) {
  return {
    id, x, y, active: true, bodyEnabled: true, hp: 100, dead: false,
    sprite: { id } as unknown as Phaser.Physics.Arcade.Sprite,
  };
}

describe('CloneSystem', () => {
  it('does not fire or start cooldown when enemy is outside triggerRangePx', () => {
    const { system, sprites, onCast, vfx } = rig();
    const passives = createPassiveStats();

    system.update(1000, 1, passives, [cand(1, 200, 0)]);
    expect(onCast).not.toHaveBeenCalled();
    expect(vfx.playSmokePoof).not.toHaveBeenCalled();
    expect(sprites).toHaveLength(0);

    system.update(1001, 1, passives, [cand(1, 100, 0)]);
    expect(onCast).toHaveBeenCalledTimes(1);
    expect(onCast).toHaveBeenCalledWith(100);
  });

  it('spawns, dashes, caps hits at maxHitsPerClone, deals exact damage/knockback, and plays smoke poofs', () => {
    const { system, sprites, damage, onCast, onStrike, vfx } = rig();
    const passives = createPassiveStats();
    const enemies = [cand(1, 100, 0), cand(2, 102, 2), cand(3, 105, -3), cand(4, 108, 4)];

    system.update(1000, 1, passives, enemies);
    expect(onCast).toHaveBeenCalledWith(100);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(1);
    expect(vfx.playSmokePoof.mock.calls[0]![0]).toBeCloseTo(42, 4);
    expect(vfx.playSmokePoof.mock.calls[0]![1]).toBeCloseTo(0, 4);
    expect(sprites[0]!.animKey).toBe('hero-skill-clone');

    for (const t of [1045, 1090]) system.update(t, 1, passives, enemies);
    expect(damage).not.toHaveBeenCalled();
    expect(onStrike).not.toHaveBeenCalled();

    for (const t of [1135, 1180, 1220]) system.update(t, 1, passives, enemies);
    expect(damage).toHaveBeenCalledTimes(2);
    expect(damage.mock.calls[0]![0]).toBe(enemies[0]!.sprite);
    expect(damage.mock.calls[0]![1]).toBe(35);
    expect(damage.mock.calls[0]![2]).toBe(180);
    expect(damage.mock.calls[1]![0]).toBe(enemies[1]!.sprite);
    expect(damage.mock.calls[1]![1]).toBe(35);
    expect(damage.mock.calls[1]![2]).toBe(180);
    expect(onStrike).toHaveBeenCalledTimes(1);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(2);
    expect(sprites[0]!.visible).toBe(false);
  });

  it('at Lv.4 spawns 4 clones staggered by 40ms and clear() hides/destroys pooled sprites', () => {
    const { system, sprites, onStrike, vfx } = rig();
    const passives = createPassiveStats();
    const enemies = [cand(1, 100, 0)];

    system.update(1000, 4, passives, enemies);
    expect(sprites).toHaveLength(4);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(1);

    system.update(1040, 4, passives, enemies);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(2);

    system.update(1080, 4, passives, enemies);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(3);

    system.update(1120, 4, passives, enemies);
    expect(vfx.playSmokePoof).toHaveBeenCalledTimes(4);

    for (let t = 1160; t <= 1400; t += 40) system.update(t, 4, passives, enemies);
    expect(onStrike).toHaveBeenCalledTimes(4);
    expect(sprites.every((s) => !s.visible)).toBe(true);

    system.clear();
    expect(sprites.every((s) => !s.visible && s.destroyed)).toBe(true);
  });
});
