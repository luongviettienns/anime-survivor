export type HeroId = 'naruto' | 'kirito';

export type HeroConfig = {
  id: HeroId;
  name: string;
  title: string;
  unlocked: boolean;
  maxHp: number;
  armor: number;
  moveSpeed: number;
  magnetRadius: number;
  invulnerabilityMs: number;
  startingWeapon: string;
  strengths: string;
  weakness: string;
  portraitKey: string;
};

export const HERO_ROSTER: readonly HeroConfig[] = [
  {
    id: 'naruto',
    name: 'NARUTO UZUMAKI',
    title: 'Shinobi — Rasengan / Evolutions',
    unlocked: true,
    maxHp: 100,
    armor: 0,
    moveSpeed: 250,
    magnetRadius: 96,
    invulnerabilityMs: 800,
    startingWeapon: 'Rasengan Chakra Orb',
    strengths: 'Balanced speed, homing orb, dual evolution paths',
    weakness: 'Zero starting armor; needs crowd-control weapons',
    portraitKey: 'lobby_hero',
  },
  {
    id: 'kirito',
    name: 'KIRITO',
    title: 'Dual-Blade Vanguard (In Progress)',
    unlocked: false,
    maxHp: 140,
    armor: 5,
    moveSpeed: 230,
    magnetRadius: 84,
    invulnerabilityMs: 950,
    startingWeapon: 'Dual Element Energy Slash',
    strengths: 'High armor (-5 Dmg), 140 HP, Ice Slow + Dark Fire Burn',
    weakness: 'Slower base speed (230 px/s) & tighter pickup radius',
    portraitKey: 'lobby_lock',
  },
];

export function canStartHero(hero: HeroConfig): boolean {
  return hero.unlocked;
}

export function cycleHeroIndex(currentIndex: number, delta: -1 | 1, count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0;
  return (((currentIndex + delta) % count) + count) % count;
}
