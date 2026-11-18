import { describe, expect, it } from 'vitest';
import { createMeleeAttack, stepMeleeAttack } from '../src/domain/meleeAttacks';

const origin = { x: 0, y: 0 };
describe('normal monster skills', () => {
  it('winds up before one slime impact and lets the player dodge its fixed center', () => {
    const state = createMeleeAttack();
    expect(stepMeleeAttack('slime', state, origin, { x: 50, y: 0 }, 0).phase).toBe('windup');
    expect(stepMeleeAttack('slime', state, origin, origin, 399).hit).toBe(false);
    expect(stepMeleeAttack('slime', state, origin, origin, 400).hit).toBe(true);
    expect(stepMeleeAttack('slime', state, origin, origin, 401).hit).toBe(false);
    const dodged = createMeleeAttack();
    stepMeleeAttack('slime', dodged, origin, origin, 0);
    expect(stepMeleeAttack('slime', dodged, origin, { x: 100, y: 0 }, 400).hit).toBe(false);
  });
  it('locks shade dash aim, hits once, then recovers and respects cooldown', () => {
    const state = createMeleeAttack();
    stepMeleeAttack('shade', state, origin, { x: 120, y: 0 }, 0);
    const launch = stepMeleeAttack('shade', state, origin, { x: 0, y: 120 }, 450);
    expect(launch.velocity).toEqual({ x: 460, y: 0 });
    expect(launch.hit).toBe(false);
    expect(stepMeleeAttack('shade', state, origin, origin, 460).hit).toBe(true);
    expect(stepMeleeAttack('shade', state, origin, origin, 470).hit).toBe(false);
    expect(stepMeleeAttack('shade', state, origin, origin, 670).phase).toBe('recover');
    expect(stepMeleeAttack('shade', state, origin, origin, 1000).phase).toBe('chase');
    expect(stepMeleeAttack('shade', state, origin, origin, 1100).phase).toBe('chase');
  });
  it('cancels an attack on interruption and skips stale damage after a long frame', () => {
    const state = createMeleeAttack();
    stepMeleeAttack('slime', state, origin, origin, 0);
    expect(stepMeleeAttack('slime', state, origin, origin, 200, true).hit).toBe(false);
    expect(stepMeleeAttack('slime', state, origin, origin, 400).phase).toBe('chase');
    const stale = createMeleeAttack();
    stepMeleeAttack('slime', stale, origin, origin, 0);
    expect(stepMeleeAttack('slime', stale, origin, origin, 2000).hit).toBe(false);
    expect(stepMeleeAttack('mage', createMeleeAttack(), origin, origin, 0).phase).toBe('chase');
  });

  it('scales slime and shade melee damage by +3 per minute', () => {
    const slime5 = createMeleeAttack();
    stepMeleeAttack('slime', slime5, origin, origin, 0, false, false, 300);
    const impact = stepMeleeAttack('slime', slime5, origin, origin, 400, false, false, 300);
    expect(impact.hit).toBe(true);
    expect(impact.damage).toBe(16 + 15);

    const shade5 = createMeleeAttack();
    stepMeleeAttack('shade', shade5, origin, origin, 0, false, false, 300);
    const dashHit = stepMeleeAttack('shade', shade5, origin, origin, 460, false, false, 300);
    expect(dashHit.hit).toBe(true);
    expect(dashHit.damage).toBe(14 + 15);
  });

  it('executes boss_blood_slash 150-degree cone strike with enraged speed/damage', () => {
    const boss = createMeleeAttack();
    expect(stepMeleeAttack('boss', boss, origin, { x: 140, y: 0 }, 0).phase).toBe('chase');
    expect(stepMeleeAttack('boss', boss, origin, { x: 100, y: 0 }, 0).phase).toBe('windup');
    expect(stepMeleeAttack('boss', boss, origin, { x: 100, y: 0 }, 599).hit).toBe(false);
    const hitFront = stepMeleeAttack('boss', boss, origin, { x: 110, y: 0 }, 600);
    expect(hitFront).toMatchObject({ phase: 'active', impact: true, hit: true, damage: 42 });

    const bossBehind = createMeleeAttack();
    stepMeleeAttack('boss', bossBehind, origin, { x: 100, y: 0 }, 0);
    expect(stepMeleeAttack('boss', bossBehind, origin, { x: -80, y: 0 }, 600).hit).toBe(false);

    const enraged = createMeleeAttack();
    stepMeleeAttack('boss', enraged, origin, { x: 100, y: 0 }, 0, false, true);
    const hitEnraged = stepMeleeAttack('boss', enraged, origin, { x: 100, y: 0 }, 480, false, true);
    expect(hitEnraged).toMatchObject({ hit: true, damage: 52 });
  });
});
