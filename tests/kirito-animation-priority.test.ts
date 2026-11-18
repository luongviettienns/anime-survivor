import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { HeroActionVisual } from '../src/game/systems/HeroActionVisual';

function rig() {
  const data = new Map<string, unknown>();
  const anims = { isPlaying: false, currentAnim: { key: '' } };
  const sprite = {
    anims, frame: { customData: { actorOrigin: [0.5, 0.9], actorScale: 0.1 } },
    setOrigin: vi.fn(() => sprite), setScale: vi.fn(() => sprite),
    setPosition: vi.fn(() => sprite), setDepth: vi.fn(() => sprite), setFlipX: vi.fn(() => sprite),
    setVisible: vi.fn(() => sprite), setData: vi.fn(() => sprite), setTexture: vi.fn(() => sprite),
    setTint: vi.fn(() => sprite), clearTint: vi.fn(() => sprite), once: vi.fn(() => sprite),
    play: vi.fn((key: string) => { anims.currentAnim = { key }; anims.isPlaying = true; return sprite; }),
    stop: vi.fn(() => { anims.isPlaying = false; return sprite; }), destroy: vi.fn(),
  };
  const player = { x: 10, y: 20, active: true, isTinted: false, tintTopLeft: 0xffffff,
    body: { velocity: { lengthSq: () => 0 } }, setVisible: vi.fn(),
    getData: (key: string) => data.get(key), setData: (key: string, value: unknown) => data.set(key, value) };
  const scene = { add: { sprite: () => sprite }, events: { on: vi.fn(), once: vi.fn(), off: vi.fn() } };
  const visual = new HeroActionVisual(scene as unknown as Phaser.Scene,
    player as unknown as Phaser.Physics.Arcade.Sprite, 'kirito');
  return { visual, sprite, player, data };
}

describe('Kirito animation priority', () => {
  it('reports a blocked sword request during Dash instead of pretending it played', () => {
    const { visual, sprite } = rig();
    visual.play('dual_slash', 1, 'kirito-dash-right');
    expect(visual.play('dual_slash', 1, 'actor-kirito_lv1_right')).toBe(false);
    expect(sprite.anims.currentAnim.key).toBe('kirito-dash-right');
  });
  it('consumes accepted hit feedback without interrupting any sword heading or Dash', () => {
    for (const direction of ['down', 'up', 'left', 'right']) for (const level of [1, 2, 3]) {
      const { visual, sprite, data, player } = rig();
      const key = `actor-kirito_lv${level}_${direction}`;
      visual.play('dual_slash', 1, key);
      player.isTinted = true; data.set('actor-hit', true); visual.update();
      expect(sprite.anims.currentAnim.key).toBe(key);
      expect(data.get('actor-hit')).toBe(false);
      expect(sprite.setTint).toHaveBeenCalled();
    }
    const { visual, sprite, data } = rig();
    visual.play('dual_slash', 1, 'kirito-dash-left'); data.set('actor-hit', true); visual.update();
    expect(sprite.anims.currentAnim.key).toBe('kirito-dash-left');
  });
  it('keeps a sword combo intact but lets death override it', () => {
    const { visual, sprite } = rig();
    visual.play('dual_slash', 1, 'actor-kirito_lv2_down');
    expect(visual.play('clone', 1)).toBe(false);
    expect(visual.defeat(vi.fn())).toBe(true);
    expect(sprite.anims.currentAnim.key).toBe('actor-kirito_death_down');
  });
});
