export const WORLD = {
  width: 1800,
  height: 1200,
  runDurationSec: 600,
} as const;

export const PLAYER = {
  speed: 250,
  maxHealth: 100,
  invulnerabilityMs: 800,
  pickupMagnetRadius: 96,
  pickupMagnetSpeed: 220,
  attackIntervalMs: 380,
} as const;

export const ENEMY = {
  baseHealth: 50,
  baseSpeed: 94,
  touchDamage: 11,
  maxAlive: 130,
  spawnDistanceMin: 360,
  spawnDistanceMax: 520,
  worldMargin: 40,
} as const;

export const PROJECTILE = {
  speed: 560,
  damage: 28,
  lifeMs: 1400,
  range: 520,
} as const;

export const PICKUP = {
  xpPerKill: 1,
  healAmount: 25,
} as const;
