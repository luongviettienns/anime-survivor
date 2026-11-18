import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { createPassiveStats } from '../src/domain/upgrades';
import { DualElementSystem } from '../src/game/systems/DualElementSystem';
import type { EnemySystem } from '../src/game/systems/EnemySystem';

function rig() {
  const shot = { width: 1792, setTexture: vi.fn(() => shot), setOrigin: vi.fn(() => shot),
    setScale: vi.fn(() => shot), setDepth: vi.fn(() => shot), setCircle: vi.fn(() => shot),
    setBlendMode: vi.fn(() => shot), setRotation: vi.fn(() => shot), setVelocity: vi.fn(() => shot), play: vi.fn(() => shot) };
  const group = { getFirstDead: () => null, create: vi.fn(() => shot) };
  const onSkill = vi.fn();
  const player = { x: 0, y: 0 } as Phaser.Physics.Arcade.Sprite;
  const candidate = { id: 1, x: 100, y: 0, active: true, bodyEnabled: true, hp: 100, dead: false,
    sprite: {} as Phaser.Physics.Arcade.Sprite };
  const system = new DualElementSystem(player, group as unknown as Phaser.Physics.Arcade.Group,
    {} as EnemySystem, new Map(), undefined, onSkill);
  return { system, group, onSkill, candidates: [candidate], passives: createPassiveStats() };
}

describe('Sword start gating during Dash', () => {
  it('starts no attack or cooldown until the Dash gate opens', () => {
    const r = rig(); const aim = { x: 1, y: 0 };
    r.system.update(0, 1, r.passives, r.candidates, aim, false);
    expect(r.onSkill).not.toHaveBeenCalled(); expect(r.group.create).not.toHaveBeenCalled();
    r.system.update(500, 1, r.passives, r.candidates, aim, true);
    expect(r.onSkill).toHaveBeenCalledTimes(1);
    r.system.update(679, 1, r.passives, r.candidates, aim, false);
    expect(r.group.create).not.toHaveBeenCalled();
    r.system.update(680, 1, r.passives, r.candidates, aim, false);
    expect(r.group.create).toHaveBeenCalledTimes(1);
  });
  it('continues both committed releases at180/450ms while new starts are blocked', () => {
    const r = rig(); const aim = { x: 1, y: 0 };
    r.system.update(0, 3, r.passives, r.candidates, aim, true);
    r.system.update(180, 3, r.passives, r.candidates, aim, false);
    expect(r.group.create).toHaveBeenCalledTimes(1);
    r.system.update(449, 3, r.passives, r.candidates, aim, false);
    expect(r.group.create).toHaveBeenCalledTimes(1);
    r.system.update(450, 3, r.passives, r.candidates, aim, false);
    expect(r.group.create).toHaveBeenCalledTimes(2);
    r.system.update(1000, 3, r.passives, r.candidates, aim, false);
    expect(r.onSkill).toHaveBeenCalledTimes(1);
  });
});
