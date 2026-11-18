import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { createPassiveStats } from '../src/domain/upgrades';
import type { EnemySystem } from '../src/game/systems/EnemySystem';
import type { VfxSystem } from '../src/game/systems/VfxSystem';
import { WeaponSystem } from '../src/game/systems/WeaponSystem';

type MockShot = {
  x: number; y: number; active: boolean; vx: number; vy: number;
  anims: { stop: ReturnType<typeof vi.fn> };
  setTexture: ReturnType<typeof vi.fn>; setScale: ReturnType<typeof vi.fn>; setDepth: ReturnType<typeof vi.fn>;
  setCircle: ReturnType<typeof vi.fn>; setBlendMode: ReturnType<typeof vi.fn>; setRotation: ReturnType<typeof vi.fn>;
  setVelocity: ReturnType<typeof vi.fn>; setPosition: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>;
  enableBody: ReturnType<typeof vi.fn>; disableBody: ReturnType<typeof vi.fn>;
};
type MockEnemy = { x: number; y: number; active: boolean };
type DamageResult = { damaged: boolean; killed: boolean; x: number; y: number; archetype: string; xpValue: number };

function makeShot(x: number, y: number): MockShot {
  const s: MockShot = {
    x, y, active: true, vx: 0, vy: 0, anims: { stop: vi.fn() },
    setTexture: vi.fn(() => s), setScale: vi.fn(() => s), setDepth: vi.fn(() => s),
    setCircle: vi.fn(() => s), setBlendMode: vi.fn(() => s), setRotation: vi.fn(() => s),
    setVelocity: vi.fn((vx: number, vy: number) => { s.vx = vx; s.vy = vy; return s; }),
    setPosition: vi.fn((nx: number, ny: number) => { s.x = nx; s.y = ny; return s; }),
    play: vi.fn(() => s),
    enableBody: vi.fn((_r: boolean, nx: number, ny: number) => { s.x = nx; s.y = ny; s.active = true; return s; }),
    disableBody: vi.fn(() => { s.active = false; return s; }),
  };
  return s;
}

function rig(killOnFirstHit = false) {
  const shots: MockShot[] = [];
  const group = { getFirstDead: vi.fn(() => null), create: vi.fn((x: number, y: number) => { const s = makeShot(x, y); shots.push(s); return s; }) };
  const graphics = {
    setDepth: vi.fn(() => graphics), clear: vi.fn(() => graphics), lineStyle: vi.fn(() => graphics),
    strokeCircle: vi.fn(() => graphics), setPosition: vi.fn(() => graphics), destroy: vi.fn(),
  };
  const scene = { physics: { add: { group: vi.fn(() => group) } }, add: { graphics: vi.fn(() => graphics), sprite: vi.fn() } };
  const player = { x: 0, y: 0, active: true, body: { velocity: { x: 0, y: 0 } } };
  const enemy1: MockEnemy = { x: 100, y: 0, active: true };
  const enemy2: MockEnemy = { x: 110, y: 0, active: true };
  const candidates = [
    { id: 1, x: enemy1.x, y: enemy1.y, active: true, bodyEnabled: true, hp: 100, dead: false, sprite: enemy1 },
    { id: 2, x: enemy2.x, y: enemy2.y, active: true, bodyEnabled: true, hp: 100, dead: false, sprite: enemy2 },
  ];
  let hits = 0;
  const damageEnemy = vi.fn<(t: MockEnemy, d: number, kb?: number, src?: { x: number; y: number }) => DamageResult>((target) => {
    hits += 1;
    const killed = killOnFirstHit && hits === 1;
    if (killed) target.active = false;
    return { damaged: true, killed, x: target.x, y: target.y, archetype: 'slime', xpValue: 1 };
  });
  const enemies = { getCandidates: vi.fn(() => candidates), damageEnemy, getState: vi.fn(), applyStatus: vi.fn() };
  const vfx = { playCastFlare: vi.fn(), playRasenganHit: vi.fn(), playSmokePoof: vi.fn() };
  const weapons = new WeaponSystem(
    scene as unknown as Phaser.Scene,
    player as unknown as Phaser.Physics.Arcade.Sprite,
    enemies as unknown as EnemySystem,
    undefined, undefined, vfx as unknown as VfxSystem, undefined, 'orb'
  );
  return { weapons, shots, enemy1, enemy2, damageEnemy, vfx };
}

describe('Rasengan Lv.2+ drill push', () => {
  it('Lv.1 orb damages enemy once (32 dmg), calls playRasenganHit, and immediately consumes orb', () => {
    const { weapons, shots, enemy1, damageEnemy, vfx } = rig();
    weapons.update(1000, true, createPassiveStats());
    const shot = shots[0]!;
    weapons.handleProjectileHit(shot as unknown as Phaser.GameObjects.GameObject, enemy1 as unknown as Phaser.GameObjects.GameObject);

    expect(damageEnemy).toHaveBeenCalledTimes(1);
    expect(damageEnemy.mock.calls[0]![0]).toBe(enemy1);
    expect(damageEnemy.mock.calls[0]![1]).toBe(32);
    expect(vfx.playRasenganHit).toHaveBeenCalledTimes(1);
    expect(shot.active).toBe(false);
  });

  it('Lv.2 orb drills at 0ms (15), +75ms (13), +150ms (19), ignores 2nd enemy, and pushes along flight dir', () => {
    const { weapons, shots, enemy1, enemy2, damageEnemy, vfx } = rig();
    const passives = createPassiveStats();
    weapons.inventory.orb = 2;

    weapons.update(1000, true, passives);
    const shot = shots[0]!;
    const speed = Math.hypot(shot.vx, shot.vy);
    const dir = { x: shot.vx / speed, y: shot.vy / speed };

    weapons.handleProjectileHit(shot as unknown as Phaser.GameObjects.GameObject, enemy1 as unknown as Phaser.GameObjects.GameObject);
    expect(damageEnemy).toHaveBeenCalledTimes(1);
    expect(damageEnemy.mock.calls[0]![1]).toBe(Math.round(42 * 0.35));
    const src1 = damageEnemy.mock.calls[0]![3]!;
    expect(src1.x).toBeCloseTo(enemy1.x - dir.x * 32, 3);
    expect(src1.y).toBeCloseTo(enemy1.y - dir.y * 32, 3);
    expect(shot.active).toBe(true);
    expect(shot.vx).toBe(0);
    expect(shot.vy).toBe(0);
    expect(vfx.playRasenganHit).not.toHaveBeenCalled();

    // Overlapping a 2nd enemy while drilling must be ignored (NO PIERCE!)
    weapons.handleProjectileHit(shot as unknown as Phaser.GameObjects.GameObject, enemy2 as unknown as Phaser.GameObjects.GameObject);
    expect(damageEnemy).toHaveBeenCalledTimes(1);

    // Mid-push tick at +75ms
    weapons.update(1075, true, passives);
    expect(damageEnemy).toHaveBeenCalledTimes(2);
    expect(damageEnemy.mock.calls[1]![1]).toBe(Math.round(42 * 0.30));
    expect(shot.x).toBeCloseTo(enemy1.x - dir.x * 10, 3);
    expect(shot.y).toBeCloseTo(enemy1.y - dir.y * 10, 3);
    expect(shot.active).toBe(true);
    expect(vfx.playRasenganHit).not.toHaveBeenCalled();

    // Detonate & consume at +150ms
    weapons.update(1150, true, passives);
    expect(damageEnemy).toHaveBeenCalledTimes(3);
    expect(damageEnemy.mock.calls[2]![1]).toBe(Math.ceil(42 * 0.45));
    expect(vfx.playRasenganHit).toHaveBeenCalledTimes(1);
    expect(shot.active).toBe(false);
  });

  it('Lv.2 orb instant-kill guard detonates immediately if tick 1 kills enemy', () => {
    const { weapons, shots, enemy1, damageEnemy, vfx } = rig(true);
    const passives = createPassiveStats();
    weapons.inventory.orb = 2;

    weapons.update(1000, true, passives);
    const shot = shots[0]!;
    weapons.handleProjectileHit(shot as unknown as Phaser.GameObjects.GameObject, enemy1 as unknown as Phaser.GameObjects.GameObject);

    expect(damageEnemy).toHaveBeenCalledTimes(1);
    expect(damageEnemy.mock.calls[0]![1]).toBe(15);
    expect(vfx.playRasenganHit).toHaveBeenCalledTimes(1);
    expect(shot.active).toBe(false);

    weapons.update(1075, true, passives);
    weapons.update(1150, true, passives);
    expect(damageEnemy).toHaveBeenCalledTimes(1);
  });
});
