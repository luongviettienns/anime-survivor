import { describe, expect, it } from 'vitest';
import { canStartHero, cycleHeroIndex, HERO_ROSTER } from '../src/domain/heroes';

describe('hero roster and lobby selection rules', () => {
  it('defines Naruto as unlocked default and Kirito as locked high-defense preview', () => {
    expect(HERO_ROSTER).toHaveLength(2);
    const naruto = HERO_ROSTER[0]!;
    const kirito = HERO_ROSTER[1]!;

    expect(naruto).toMatchObject({
      id: 'naruto',
      unlocked: true,
      maxHp: 100,
      armor: 0,
      moveSpeed: 250,
      magnetRadius: 96,
      invulnerabilityMs: 800,
    });
    expect(kirito).toMatchObject({
      id: 'kirito',
      unlocked: false,
      maxHp: 140,
      armor: 5,
      moveSpeed: 230,
      magnetRadius: 84,
      invulnerabilityMs: 950,
    });
    expect(canStartHero(naruto)).toBe(true);
    expect(canStartHero(kirito)).toBe(false);
  });

  it('cycles hero selection index cleanly with wrap-around', () => {
    expect(cycleHeroIndex(0, 1, 2)).toBe(1);
    expect(cycleHeroIndex(1, 1, 2)).toBe(0);
    expect(cycleHeroIndex(0, -1, 2)).toBe(1);
    expect(cycleHeroIndex(1, -1, 2)).toBe(0);
    expect(cycleHeroIndex(0, 1, 1)).toBe(0);
  });
});
