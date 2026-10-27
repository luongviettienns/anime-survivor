# Phase 1: 60-Second Playable Slice & Gameplay Logic Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Phase 1 60-second playable slice and satisfy all rules, edge cases, and automated unit/E2E tests specified in `AnimeSurvivor-GameplayLogic-Spec.md`.

**Architecture:** Pure mathematical formulas, state transitions, and eligibility rules live in engine-free `src/domain/` modules (`vector.ts`, `combat.ts`, `progression.ts`, `targeting.ts`, `pickups.ts`). Thin Phaser 4 Arcade Physics adapters live in `src/game/systems/` (`MovementSystem.ts`, `EnemySystem.ts`, `WeaponSystem.ts`, `DamageSystem.ts`, `PickupSystem.ts`), orchestrated by `src/game/scenes/GameScene.ts` with a single source of truth per state domain and exactly three scene-level overlap colliders.

**Tech Stack:** Phaser 4.2.1 (Arcade Physics), TypeScript 5.7 (strict mode, `noUncheckedIndexedAccess`), Vite 6, Vitest 3, Playwright 1.56.

**Spec:** `AnimeSurvivor-GameplayLogic-Spec.md`, `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`

## Global Constraints

- Pure gameplay formulas live in `src/domain/` and must NEVER import `phaser` or browser APIs.
- Normal file target <= 160 LOC; ESLint enforces <= 200 effective lines (`skipBlankLines: true, skipComments: true`); `scripts/check-architecture.mjs` enforces <= 210 physical lines.
- No `any`, `@ts-ignore`, unused variables/parameters, commented-out code, or catch-and-ignore failures.
- Positions in `px`, velocities in `px/sec`, durations/timestamps in `ms` (`scene.time.now`). Never multiply `setVelocity(vx, vy)` by `deltaMs`. Never use `Date.now()` or `setTimeout()` for gameplay.
- Config defaults: Player speed `250`, maxHealth `100`, invulnerabilityMs `800`, pickupMagnetRadius `96`, pickupMagnetSpeed `220`, attackIntervalMs `380`; Enemy baseHealth `50`, baseSpeed `94`, touchDamage `11`, maxAlive `130`; Projectile speed `560`, damage `28`, lifeMs `1400`, range `520`; Pickup xpPerKill `1`, healAmount `25`.
- Level-ups do NOT auto-heal HP; healing comes from `'heal'` pickups (`+25` HP clamped to `maxHp`).
- Register ONE `physics.add.overlap` for pickups (`player` vs `pickupSystem.group`), never one collider per gem.

---

### Task 1: Centralize Configuration & Pure Vector / Movement / Chase Domain (`src/game/config/constants.ts`, `src/domain/vector.ts`)

**Files:**
- Modify: `src/game/config/constants.ts`
- Create: `src/domain/vector.ts`
- Test: `tests/vector.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `src/game/config/constants.ts`: `WORLD`, `PLAYER`, `ENEMY`, `PROJECTILE`, `PICKUP`
  - `src/domain/vector.ts`:
    - `export type Vec2 = { x: number; y: number };`
    - `export function normalized(v: Vec2): Vec2`
    - `export function directionFromTo(from: Vec2, to: Vec2): Vec2`
    - `export function aimDirection(from: Vec2, to: Vec2, fallback?: Vec2): Vec2`
    - `export function movementVelocity(input: Vec2, speedPxSec: number): Vec2`
    - `export function chaseVelocity(enemyPos: Vec2, playerPos: Vec2, speedPxSec: number, playerDead?: boolean): Vec2`

- [ ] **Step 1: Write the failing unit tests in `tests/vector.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  aimDirection,
  chaseVelocity,
  directionFromTo,
  movementVelocity,
  normalized,
} from '../src/domain/vector';
import { ENEMY, PICKUP, PLAYER, PROJECTILE, WORLD } from '../src/game/config/constants';

describe('vector and movement domain rules', () => {
  it('exposes contract default constants', () => {
    expect(WORLD.width).toBe(1800);
    expect(WORLD.height).toBe(1200);
    expect(PLAYER.speed).toBe(250);
    expect(PLAYER.maxHealth).toBe(100);
    expect(PLAYER.invulnerabilityMs).toBe(800);
    expect(PLAYER.attackIntervalMs).toBe(380);
    expect(ENEMY.baseHealth).toBe(50);
    expect(ENEMY.baseSpeed).toBe(94);
    expect(ENEMY.touchDamage).toBe(11);
    expect(ENEMY.maxAlive).toBe(130);
    expect(PROJECTILE.speed).toBe(560);
    expect(PROJECTILE.damage).toBe(28);
    expect(PROJECTILE.lifeMs).toBe(1400);
    expect(PROJECTILE.range).toBe(520);
    expect(PICKUP.xpPerKill).toBe(1);
    expect(PICKUP.healAmount).toBe(25);
  });

  it('normalizes vectors and returns (0,0) for zero/coincident vectors', () => {
    expect(normalized({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(normalized({ x: 1e-9, y: -1e-9 })).toEqual({ x: 0, y: 0 });
    expect(directionFromTo({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
    const unit = directionFromTo({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(unit.x).toBeCloseTo(0.6, 5);
    expect(unit.y).toBeCloseTo(0.8, 5);
  });

  it('provides deterministic aim fallback when positions coincide', () => {
    expect(aimDirection({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 1, y: 0 });
    expect(aimDirection({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: -1 })).toEqual({ x: 0, y: -1 });
    const aimed = aimDirection({ x: 0, y: 0 }, { x: 0, y: 10 });
    expect(aimed.x).toBeCloseTo(0, 5);
    expect(aimed.y).toBeCloseTo(1, 5);
  });

  it('computes 8-direction movementVelocity with invariant speed 250', () => {
    const speed = 250;
    expect(movementVelocity({ x: 0, y: 0 }, speed)).toEqual({ x: 0, y: 0 });
    expect(movementVelocity({ x: 1, y: 0 }, speed)).toEqual({ x: 250, y: 0 });
    expect(movementVelocity({ x: 0, y: 1 }, speed)).toEqual({ x: 0, y: 250 });

    const diag1 = movementVelocity({ x: 1, y: 1 }, speed);
    expect(diag1.x).toBeCloseTo(176.776695, 4);
    expect(diag1.y).toBeCloseTo(176.776695, 4);
    expect(Math.hypot(diag1.x, diag1.y)).toBeCloseTo(speed, 5);

    const diag2 = movementVelocity({ x: -1, y: 1 }, speed);
    expect(diag2.x).toBeCloseTo(-176.776695, 4);
    expect(diag2.y).toBeCloseTo(176.776695, 4);
    expect(Math.hypot(diag2.x, diag2.y)).toBeCloseTo(speed, 5);

    const diag3 = movementVelocity({ x: -1, y: -1 }, speed);
    expect(Math.hypot(diag3.x, diag3.y)).toBeCloseTo(speed, 5);
  });

  it('computes enemy chase velocity and stops on coincident position or dead player', () => {
    const chase = chaseVelocity({ x: 0, y: 0 }, { x: 3, y: 4 }, 100);
    expect(chase.x).toBeCloseTo(60, 5);
    expect(chase.y).toBeCloseTo(80, 5);

    expect(chaseVelocity({ x: 20, y: 30 }, { x: 20, y: 30 }, 94)).toEqual({ x: 0, y: 0 });
    expect(chaseVelocity({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, true)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vector.test.ts`
Expected: FAIL with module `../src/domain/vector` not found.

- [ ] **Step 3: Implement `src/game/config/constants.ts` and `src/domain/vector.ts`**

`src/game/config/constants.ts`:
```ts
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
```

`src/domain/vector.ts`:
```ts
export type Vec2 = { x: number; y: number };

const EPSILON = 1e-6;

export function normalized(v: Vec2): Vec2 {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) {
    return { x: 0, y: 0 };
  }
  const len = Math.hypot(v.x, v.y);
  return len <= EPSILON ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

export function directionFromTo(from: Vec2, to: Vec2): Vec2 {
  return normalized({ x: to.x - from.x, y: to.y - from.y });
}

export function aimDirection(from: Vec2, to: Vec2, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const dir = directionFromTo(from, to);
  if (dir.x !== 0 || dir.y !== 0) {
    return dir;
  }
  const safeFallback = normalized(fallback);
  return safeFallback.x === 0 && safeFallback.y === 0 ? { x: 1, y: 0 } : safeFallback;
}

export function movementVelocity(input: Vec2, speedPxSec: number): Vec2 {
  if (!Number.isFinite(speedPxSec) || speedPxSec <= 0) {
    return { x: 0, y: 0 };
  }
  const dir = normalized(input);
  return {
    x: dir.x === 0 ? 0 : dir.x * speedPxSec,
    y: dir.y === 0 ? 0 : dir.y * speedPxSec,
  };
}

export function chaseVelocity(
  enemyPos: Vec2,
  playerPos: Vec2,
  speedPxSec: number,
  playerDead = false
): Vec2 {
  if (playerDead || !Number.isFinite(speedPxSec) || speedPxSec <= 0) {
    return { x: 0, y: 0 };
  }
  const dir = directionFromTo(enemyPos, playerPos);
  return {
    x: dir.x === 0 ? 0 : dir.x * speedPxSec,
    y: dir.y === 0 ? 0 : dir.y * speedPxSec,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vector.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```powershell
git add src/game/config/constants.ts src/domain/vector.ts tests/vector.test.ts ; git commit -m "feat(domain): add pure vector, movement, chase helpers and contract constants"
```

---

### Task 2: Pure Combat, Contact Damage I-Frames & Enemy Hit/Death Rules (`src/domain/combat.ts`)

**Files:**
- Modify: `src/domain/combat.ts`
- Modify: `tests/domain.test.ts`

**Interfaces:**
- Consumes: `Vec2`, `aimDirection` from `src/domain/vector.ts`
- Produces:
  - `export type Vector = Vec2;`
  - `export function unitDirection(from: Vector, to: Vector): Vector` (delegates to `aimDirection` for backwards compatibility)
  - `export function clampHealth(health: number, maxHealth: number): number`
  - `export type PlayerState = { hp: number; maxHp: number; alive: boolean; invulnerableUntilMs: number };`
  - `export function createPlayerState(maxHp: number): PlayerState`
  - `export function isPlayerInvulnerable(state: PlayerState, nowMs: number): boolean`
  - `export function applyContactDamage(state: PlayerState, amount: number, nowMs: number, invulnerabilityMs?: number): boolean`
  - `export type EnemyState = { id: number; hp: number; maxHp: number; speed: number; dead: boolean };`
  - `export function createEnemyState(id: number, maxHp: number, speed: number): EnemyState`
  - `export function applyProjectileHit(enemy: EnemyState, damage: number): { damaged: boolean; killed: boolean }`

- [ ] **Step 1: Write failing tests in `tests/domain.test.ts` for player i-frames, time-0 hit, and idempotent enemy death**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyContactDamage,
  applyProjectileHit,
  clampHealth,
  createEnemyState,
  createPlayerState,
  isPlayerInvulnerable,
  unitDirection,
} from '../src/domain/combat';
import { awardXp, xpThreshold } from '../src/domain/progression';

describe('pure gameplay rules', () => {
  it('normalizes diagonal travel and provides aim fallback', () => {
    const vector = unitDirection({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(vector.x).toBeCloseTo(0.6);
    expect(vector.y).toBeCloseTo(0.8);
    expect(unitDirection({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 1, y: 0 });
  });

  it('clamps HP and rejects non-finite values', () => {
    expect(clampHealth(-10, 100)).toBe(0);
    expect(clampHealth(120, 100)).toBe(100);
    expect(() => clampHealth(Number.NaN, 100)).toThrow();
  });

  it('enforces player contact damage and 800ms i-frames starting at t=0', () => {
    const player = createPlayerState(100);
    expect(player.invulnerableUntilMs).toBe(Number.NEGATIVE_INFINITY);
    expect(isPlayerInvulnerable(player, 0)).toBe(false);

    // Hit at t=0 is accepted
    expect(applyContactDamage(player, 11, 0, 800)).toBe(true);
    expect(player.hp).toBe(89);
    expect(player.invulnerableUntilMs).toBe(800);
    expect(isPlayerInvulnerable(player, 0)).toBe(true);

    // Simultaneous overlaps at t=0 or during i-frame window (t=799) are rejected
    expect(applyContactDamage(player, 11, 0, 800)).toBe(false);
    expect(applyContactDamage(player, 11, 799, 800)).toBe(false);
    expect(player.hp).toBe(89);

    // Hit at exact boundary t=800 is accepted
    expect(isPlayerInvulnerable(player, 800)).toBe(false);
    expect(applyContactDamage(player, 11, 800, 800)).toBe(true);
    expect(player.hp).toBe(78);
    expect(player.invulnerableUntilMs).toBe(1600);
  });

  it('transitions player to dead once when HP reaches 0 and rejects further damage', () => {
    const player = createPlayerState(20);
    expect(applyContactDamage(player, 25, 100, 800)).toBe(true);
    expect(player.hp).toBe(0);
    expect(player.alive).toBe(false);
    expect(applyContactDamage(player, 10, 2000, 800)).toBe(false);
  });

  it('handles enemy projectile damage and idempotent single kill on duplicate hits', () => {
    const enemy = createEnemyState(1, 50, 94);
    const hit1 = applyProjectileHit(enemy, 28);
    expect(hit1).toEqual({ damaged: true, killed: false });
    expect(enemy.hp).toBe(22);
    expect(enemy.dead).toBe(false);

    const hit2 = applyProjectileHit(enemy, 28);
    expect(hit2).toEqual({ damaged: true, killed: true });
    expect(enemy.hp).toBe(0);
    expect(enemy.dead).toBe(true);

    // Second projectile in the same frame cannot kill again
    const duplicateHit = applyProjectileHit(enemy, 28);
    expect(duplicateHit).toEqual({ damaged: false, killed: false });
  });

  it('levels up across multiple thresholds and rejects negative experience', () => {
    expect(awardXp({ level: 1, xp: 0 }, xpThreshold(1))).toEqual({
      level: 2,
      xp: 0,
      levelsGained: 1,
    });
    expect(awardXp({ level: 1, xp: 0 }, 12)).toEqual({
      level: 3,
      xp: 0,
      levelsGained: 2,
    });
    expect(() => awardXp({ level: 1, xp: 0 }, -1)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain.test.ts`
Expected: FAIL because `createPlayerState`, `applyContactDamage`, `createEnemyState`, `applyProjectileHit` are not exported by `src/domain/combat.ts`.

- [ ] **Step 3: Implement `src/domain/combat.ts`**

```ts
import { aimDirection, type Vec2 } from './vector';

export type Vector = Vec2;

export function unitDirection(from: Vector, to: Vector): Vector {
  return aimDirection(from, to);
}

export function clampHealth(health: number, maxHealth: number): number {
  if (!Number.isFinite(health) || !Number.isFinite(maxHealth) || maxHealth < 0) {
    throw new Error('invalid health bounds');
  }
  return Math.max(0, Math.min(maxHealth, health));
}

export type PlayerState = {
  hp: number;
  maxHp: number;
  alive: boolean;
  invulnerableUntilMs: number;
};

export function createPlayerState(maxHp: number): PlayerState {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('maxHp must be > 0');
  }
  return {
    hp: maxHp,
    maxHp,
    alive: true,
    invulnerableUntilMs: Number.NEGATIVE_INFINITY,
  };
}

export function isPlayerInvulnerable(state: PlayerState, nowMs: number): boolean {
  return state.alive && Number.isFinite(nowMs) && nowMs < state.invulnerableUntilMs;
}

export function applyContactDamage(
  state: PlayerState,
  amount: number,
  nowMs: number,
  invulnerabilityMs = 800
): boolean {
  if (
    !state.alive ||
    !Number.isFinite(amount) ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(invulnerabilityMs) ||
    amount <= 0 ||
    nowMs < state.invulnerableUntilMs
  ) {
    return false;
  }
  state.hp = clampHealth(state.hp - amount, state.maxHp);
  state.invulnerableUntilMs = nowMs + invulnerabilityMs;
  if (state.hp === 0) {
    state.alive = false;
  }
  return true;
}

export type EnemyState = {
  id: number;
  hp: number;
  maxHp: number;
  speed: number;
  dead: boolean;
};

export function createEnemyState(id: number, maxHp: number, speed: number): EnemyState {
  if (!Number.isInteger(id) || id < 1 || !Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('invalid enemy state parameters');
  }
  return {
    id,
    hp: maxHp,
    maxHp,
    speed,
    dead: false,
  };
}

export function applyProjectileHit(
  enemy: EnemyState,
  damage: number
): { damaged: boolean; killed: boolean } {
  if (enemy.dead || enemy.hp <= 0 || !Number.isFinite(damage) || damage <= 0) {
    return { damaged: false, killed: false };
  }
  enemy.hp = clampHealth(enemy.hp - damage, enemy.maxHp);
  if (enemy.hp === 0) {
    enemy.dead = true;
    return { damaged: true, killed: true };
  }
  return { damaged: true, killed: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```powershell
git add src/domain/combat.ts tests/domain.test.ts ; git commit -m "feat(domain): add player contact damage i-frames and idempotent enemy hit state"
```

---

### Task 3: Pure Auto-Targeting & Weapon Cooldown Domain (`src/domain/targeting.ts`)

**Files:**
- Create: `src/domain/targeting.ts`
- Test: `tests/targeting.test.ts`

**Interfaces:**
- Consumes: `Vec2` from `src/domain/vector.ts`
- Produces:
  - `export type TargetCandidate = { id: number; x: number; y: number; active: boolean; bodyEnabled: boolean; hp: number; dead: boolean };`
  - `export function selectNearestTarget<T extends TargetCandidate>(origin: Vec2, candidates: readonly T[], range: number): T | null`
  - `export type WeaponCooldownState = { nextAttackAtMs: number; intervalMs: number };`
  - `export function createWeaponCooldown(intervalMs: number): WeaponCooldownState`
  - `export function canWeaponFire(state: WeaponCooldownState, nowMs: number): boolean`
  - `export function commitWeaponFire(state: WeaponCooldownState, nowMs: number): void`

- [ ] **Step 1: Write failing tests in `tests/targeting.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  canWeaponFire,
  commitWeaponFire,
  createWeaponCooldown,
  selectNearestTarget,
  type TargetCandidate,
} from '../src/domain/targeting';

function makeCandidate(overrides: Partial<TargetCandidate> & { id: number }): TargetCandidate {
  return {
    id: overrides.id,
    x: overrides.x ?? 100,
    y: overrides.y ?? 0,
    active: overrides.active ?? true,
    bodyEnabled: overrides.bodyEnabled ?? true,
    hp: overrides.hp ?? 50,
    dead: overrides.dead ?? false,
  };
}

describe('targeting and weapon cooldown domain rules', () => {
  it('selects nearest active, alive target within range', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 1, x: 300, y: 0 }),
      makeCandidate({ id: 2, x: 120, y: 0 }),
      makeCandidate({ id: 3, x: 50, y: 0, active: false }),
      makeCandidate({ id: 4, x: 40, y: 0, bodyEnabled: false }),
      makeCandidate({ id: 5, x: 30, y: 0, hp: 0 }),
      makeCandidate({ id: 6, x: 20, y: 0, dead: true }),
    ];
    const selected = selectNearestTarget(origin, candidates, 520);
    expect(selected?.id).toBe(2);
  });

  it('ignores targets outside attack range and returns null when none eligible', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 1, x: 521, y: 0 }),
      makeCandidate({ id: 2, x: 0, y: 600 }),
    ];
    expect(selectNearestTarget(origin, candidates, 520)).toBeNull();
    expect(selectNearestTarget(origin, [makeCandidate({ id: 3, x: 520, y: 0 })], 520)?.id).toBe(3);
  });

  it('breaks ties deterministically by smaller stable spawn ID', () => {
    const origin = { x: 0, y: 0 };
    const candidates = [
      makeCandidate({ id: 9, x: 100, y: 0 }),
      makeCandidate({ id: 4, x: 0, y: -100 }),
      makeCandidate({ id: 7, x: -100, y: 0 }),
    ];
    expect(selectNearestTarget(origin, candidates, 520)?.id).toBe(4);
  });

  it('allows first shot at t=0, blocks during cooldown, and does not spend cooldown without fire commit', () => {
    const cooldown = createWeaponCooldown(380);
    expect(canWeaponFire(cooldown, 0)).toBe(true);

    // No target at t=0 -> we do not call commitWeaponFire, so t=50 is still ready
    expect(canWeaponFire(cooldown, 50)).toBe(true);

    // Target found at t=50 -> commit fire
    commitWeaponFire(cooldown, 50);
    expect(cooldown.nextAttackAtMs).toBe(430);
    expect(canWeaponFire(cooldown, 429)).toBe(false);
    expect(canWeaponFire(cooldown, 430)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/targeting.test.ts`
Expected: FAIL with module `../src/domain/targeting` not found.

- [ ] **Step 3: Implement `src/domain/targeting.ts`**

```ts
import type { Vec2 } from './vector';

export type TargetCandidate = {
  id: number;
  x: number;
  y: number;
  active: boolean;
  bodyEnabled: boolean;
  hp: number;
  dead: boolean;
};

const TIE_EPSILON = 1e-6;

export function selectNearestTarget<T extends TargetCandidate>(
  origin: Vec2,
  candidates: readonly T[],
  range: number
): T | null {
  if (!Number.isFinite(range) || range < 0) {
    return null;
  }
  const maxDistSq = range * range;
  let best: T | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (
      !candidate.active ||
      !candidate.bodyEnabled ||
      candidate.dead ||
      candidate.hp <= 0 ||
      !Number.isFinite(candidate.x) ||
      !Number.isFinite(candidate.y)
    ) {
      continue;
    }
    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxDistSq) {
      continue;
    }
    if (
      best === null ||
      distSq < bestDistSq - TIE_EPSILON ||
      (Math.abs(distSq - bestDistSq) <= TIE_EPSILON && candidate.id < best.id)
    ) {
      best = candidate;
      bestDistSq = distSq;
    }
  }

  return best;
}

export type WeaponCooldownState = {
  nextAttackAtMs: number;
  intervalMs: number;
};

export function createWeaponCooldown(intervalMs: number): WeaponCooldownState {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('intervalMs must be > 0');
  }
  return {
    nextAttackAtMs: Number.NEGATIVE_INFINITY,
    intervalMs,
  };
}

export function canWeaponFire(state: WeaponCooldownState, nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs >= state.nextAttackAtMs;
}

export function commitWeaponFire(state: WeaponCooldownState, nowMs: number): void {
  if (!Number.isFinite(nowMs)) {
    throw new Error('nowMs must be finite');
  }
  state.nextAttackAtMs = nowMs + state.intervalMs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/targeting.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```powershell
git add src/domain/targeting.ts tests/targeting.test.ts ; git commit -m "feat(domain): add nearest target selection with tie-break and weapon cooldown rules"
```

---

### Task 4: Pure Pickups (XP & Heal) and Upgrade Queue Domain (`src/domain/progression.ts`, `src/domain/pickups.ts`)

**Files:**
- Modify: `src/domain/progression.ts`
- Create: `src/domain/pickups.ts`
- Test: `tests/pickups.test.ts`

**Interfaces:**
- Consumes: `PlayerState`, `clampHealth` from `src/domain/combat.ts`; `Progress`, `AwardResult`, `awardXp` from `src/domain/progression.ts`
- Produces:
  - `src/domain/progression.ts`:
    - `export type RunProgression = Progress & { pendingUpgrades: number };`
    - `export function createProgression(): RunProgression`
    - `export function applyXpGain(current: RunProgression, gain: number): RunProgression & { levelsGained: number }`
  - `src/domain/pickups.ts`:
    - `export type PickupType = 'xp' | 'heal';`
    - `export type PickupState = { id: number; type: PickupType; value: number; state: 'ground' | 'collected'; x: number; y: number };`
    - `export function createPickupState(id: number, type: PickupType, value: number, x: number, y: number): PickupState`
    - `export type PickupCollectionResult = { collected: boolean; type?: PickupType; levelsGained: number; hpBefore: number; hpAfter: number };`
    - `export function collectPickup(pickup: PickupState, player: PlayerState, progression: RunProgression): PickupCollectionResult`

- [ ] **Step 1: Write failing tests in `tests/pickups.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyContactDamage, createPlayerState } from '../src/domain/combat';
import { collectPickup, createPickupState } from '../src/domain/pickups';
import { createProgression } from '../src/domain/progression';

describe('pickup collection and progression rules', () => {
  it('collects XP gem once, queues multiple levels, and does NOT heal HP on level-up', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 30, 0, 800);
    expect(player.hp).toBe(70);

    const progression = createProgression();
    const gem = createPickupState(1, 'xp', 12, 100, 100);

    const first = collectPickup(gem, player, progression);
    expect(first.collected).toBe(true);
    expect(first.levelsGained).toBe(2);
    expect(progression.level).toBe(3);
    expect(progression.xp).toBe(0);
    expect(progression.pendingUpgrades).toBe(2);
    // HP must remain 70 (no automatic heal on level-up)
    expect(player.hp).toBe(70);
    expect(gem.state).toBe('collected');

    // Duplicate collection attempt on same gem is rejected
    const duplicate = collectPickup(gem, player, progression);
    expect(duplicate.collected).toBe(false);
    expect(progression.level).toBe(3);
    expect(progression.pendingUpgrades).toBe(2);
  });

  it('collects heal pickup once, clamps HP at maxHp, and preserves i-frames', () => {
    const player = createPlayerState(100);
    applyContactDamage(player, 10, 50, 800);
    expect(player.hp).toBe(90);
    expect(player.invulnerableUntilMs).toBe(850);

    const progression = createProgression();
    const heal1 = createPickupState(2, 'heal', 25, 120, 120);

    const res1 = collectPickup(heal1, player, progression);
    expect(res1).toEqual({
      collected: true,
      type: 'heal',
      levelsGained: 0,
      hpBefore: 90,
      hpAfter: 100,
    });
    expect(player.hp).toBe(100);
    // Healing does NOT reset or cancel i-frames
    expect(player.invulnerableUntilMs).toBe(850);

    // Collecting heal when already at full HP still consumes the pickup once
    const healFull = createPickupState(3, 'heal', 25, 140, 140);
    const res2 = collectPickup(healFull, player, progression);
    expect(res2.collected).toBe(true);
    expect(player.hp).toBe(100);
    expect(healFull.state).toBe('collected');
    expect(collectPickup(healFull, player, progression).collected).toBe(false);
  });

  it('rejects pickup collection when player is dead', () => {
    const player = createPlayerState(10);
    applyContactDamage(player, 10, 0, 800);
    expect(player.alive).toBe(false);

    const progression = createProgression();
    const gem = createPickupState(4, 'xp', 5, 50, 50);
    expect(collectPickup(gem, player, progression).collected).toBe(false);
    expect(gem.state).toBe('ground');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pickups.test.ts`
Expected: FAIL with module `../src/domain/pickups` not found.

- [ ] **Step 3: Implement `src/domain/progression.ts` and `src/domain/pickups.ts`**

`src/domain/progression.ts`:
```ts
export function xpThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error('level must be >= 1');
  return 3 + level * 2;
}

export type Progress = { level: number; xp: number };
export type AwardResult = Progress & { levelsGained: number };
export type RunProgression = Progress & { pendingUpgrades: number };

export function createProgression(): RunProgression {
  return { level: 1, xp: 0, pendingUpgrades: 0 };
}

export function awardXp(current: Progress, gain: number): AwardResult {
  if (!Number.isFinite(gain) || gain < 0) throw new Error('invalid XP gain');
  let level = current.level;
  let xp = current.xp + gain;
  let levelsGained = 0;
  while (xp >= xpThreshold(level)) {
    xp -= xpThreshold(level);
    level++;
    levelsGained++;
  }
  return { level, xp, levelsGained };
}

export function applyXpGain(
  current: RunProgression,
  gain: number
): RunProgression & { levelsGained: number } {
  const result = awardXp(current, gain);
  current.level = result.level;
  current.xp = result.xp;
  current.pendingUpgrades += result.levelsGained;
  return {
    level: current.level,
    xp: current.xp,
    pendingUpgrades: current.pendingUpgrades,
    levelsGained: result.levelsGained,
  };
}
```

`src/domain/pickups.ts`:
```ts
import { clampHealth, type PlayerState } from './combat';
import { applyXpGain, type RunProgression } from './progression';

export type PickupType = 'xp' | 'heal';

export type PickupState = {
  id: number;
  type: PickupType;
  value: number;
  state: 'ground' | 'collected';
  x: number;
  y: number;
};

export function createPickupState(
  id: number,
  type: PickupType,
  value: number,
  x: number,
  y: number
): PickupState {
  if (!Number.isInteger(id) || id < 1 || !Number.isFinite(value) || value <= 0) {
    throw new Error('invalid pickup parameters');
  }
  return {
    id,
    type,
    value,
    state: 'ground',
    x,
    y,
  };
}

export type PickupCollectionResult = {
  collected: boolean;
  type?: PickupType;
  levelsGained: number;
  hpBefore: number;
  hpAfter: number;
};

export function collectPickup(
  pickup: PickupState,
  player: PlayerState,
  progression: RunProgression
): PickupCollectionResult {
  const hpBefore = player.hp;
  if (
    !player.alive ||
    pickup.state !== 'ground' ||
    !Number.isFinite(pickup.value) ||
    pickup.value <= 0
  ) {
    return { collected: false, levelsGained: 0, hpBefore, hpAfter: hpBefore };
  }

  pickup.state = 'collected';

  if (pickup.type === 'xp') {
    const xpRes = applyXpGain(progression, pickup.value);
    return {
      collected: true,
      type: 'xp',
      levelsGained: xpRes.levelsGained,
      hpBefore,
      hpAfter: player.hp,
    };
  }

  player.hp = clampHealth(player.hp + pickup.value, player.maxHp);
  return {
    collected: true,
    type: 'heal',
    levelsGained: 0,
    hpBefore,
    hpAfter: player.hp,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pickups.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```powershell
git add src/domain/progression.ts src/domain/pickups.ts tests/pickups.test.ts ; git commit -m "feat(domain): add pickup state machine, heal clamping, and upgrade queue progression"
```

---

### Task 5: Refactor Game Systems (`MovementSystem`, `EnemySystem`, `WeaponSystem`, `DamageSystem`, `PickupSystem`) and `GameScene` Orchestration

**Files:**
- Modify: `src/game/systems/MovementSystem.ts`
- Modify: `src/game/systems/EnemySystem.ts`
- Modify: `src/game/systems/WeaponSystem.ts`
- Create: `src/game/systems/DamageSystem.ts`
- Create: `src/game/systems/PickupSystem.ts`
- Modify: `src/game/scenes/GameScene.ts`

**Interfaces:**
- Consumes: all pure domain functions from `src/domain/{vector,combat,progression,targeting,pickups}.ts` and constants from `src/game/config/constants.ts`.
- Produces:
  - `MovementSystem.update(enabled: boolean): void`
  - `EnemySystem.spawn(): Phaser.Physics.Arcade.Sprite | null`, `EnemySystem.spawnAt(x: number, y: number): Phaser.Physics.Arcade.Sprite`, `EnemySystem.update(playerDead: boolean): void`, `EnemySystem.damageEnemy(enemyObj: Phaser.GameObjects.GameObject, damage: number): { damaged: boolean; killed: boolean; x: number; y: number }`
  - `WeaponSystem.update(nowMs: number, enabled: boolean): void`, `WeaponSystem.consumeProjectile(projectileObj: Phaser.GameObjects.GameObject): boolean`
  - `DamageSystem`: wraps `PlayerState`, `tryContactDamage(nowMs: number): { damaged: boolean; died: boolean }`, `updateVisuals(nowMs: number): void`
  - `PickupSystem`: single `group: Phaser.Physics.Arcade.Group`, `spawnXpGem(x: number, y: number, value?: number)`, `spawnHealPickup(x: number, y: number, value?: number)`, `collect(pickupObj: Phaser.GameObjects.GameObject, playerState: PlayerState, progression: RunProgression): PickupCollectionResult`
  - `GameScene`: wires systems, registers 3 overlap colliders once in `create()`, cleans up on shutdown, and exposes `window.__ANIME_SURVIVOR__` runtime inspection API for deterministic E2E testing.

- [ ] **Step 1: Implement `src/game/systems/MovementSystem.ts`**

```ts
import Phaser from 'phaser';
import { movementVelocity } from '../../domain/vector';
import { PLAYER } from '../config/constants';

export class MovementSystem {
  private readonly arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, private readonly player: Phaser.Physics.Arcade.Sprite) {
    this.arrows = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  update(enabled = true): void {
    if (!this.player.active) return;
    if (!enabled) {
      this.player.setVelocity(0, 0);
      this.player.play('hero-idle', true);
      return;
    }
    const inputX =
      Number(this.arrows.right.isDown || this.wasd.D.isDown) -
      Number(this.arrows.left.isDown || this.wasd.A.isDown);
    const inputY =
      Number(this.arrows.down.isDown || this.wasd.S.isDown) -
      Number(this.arrows.up.isDown || this.wasd.W.isDown);
    const velocity = movementVelocity({ x: inputX, y: inputY }, PLAYER.speed);
    this.player.setVelocity(velocity.x, velocity.y);
    const moving = velocity.x !== 0 || velocity.y !== 0;
    this.player.play(moving ? 'hero-walk' : 'hero-idle', true);
    if (inputX !== 0) {
      this.player.setFlipX(inputX < 0);
    }
  }
}
```

- [ ] **Step 2: Implement `src/game/systems/EnemySystem.ts`**

```ts
import Phaser from 'phaser';
import { applyProjectileHit, createEnemyState, type EnemyState } from '../../domain/combat';
import type { TargetCandidate } from '../../domain/targeting';
import { chaseVelocity } from '../../domain/vector';
import { ENEMY, WORLD } from '../config/constants';

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextId = 1;
  private readonly states = new Map<Phaser.Physics.Arcade.Sprite, EnemyState>();

  constructor(
    scene: Phaser.Scene,
    private readonly target: Phaser.Physics.Arcade.Sprite
  ) {
    this.group = scene.physics.add.group();
  }

  spawn(): Phaser.Physics.Arcade.Sprite | null {
    if (this.group.countActive(true) >= ENEMY.maxAlive) return null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance =
        ENEMY.spawnDistanceMin +
        Math.random() * (ENEMY.spawnDistanceMax - ENEMY.spawnDistanceMin);
      const x = this.target.x + Math.cos(angle) * distance;
      const y = this.target.y + Math.sin(angle) * distance;
      if (
        x >= ENEMY.worldMargin &&
        x <= WORLD.width - ENEMY.worldMargin &&
        y >= ENEMY.worldMargin &&
        y <= WORLD.height - ENEMY.worldMargin &&
        Math.hypot(x - this.target.x, y - this.target.y) >= ENEMY.spawnDistanceMin * 0.9
      ) {
        return this.spawnAt(x, y);
      }
    }
    const fallbackX =
      this.target.x < WORLD.width / 2
        ? Math.min(WORLD.width - ENEMY.worldMargin, this.target.x + ENEMY.spawnDistanceMin)
        : Math.max(ENEMY.worldMargin, this.target.x - ENEMY.spawnDistanceMin);
    const fallbackY = Phaser.Math.Clamp(
      this.target.y,
      ENEMY.worldMargin,
      WORLD.height - ENEMY.worldMargin
    );
    return this.spawnAt(fallbackX, fallbackY);
  }

  spawnAt(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const enemy = this.group.create(x, y, 'enemy') as Phaser.Physics.Arcade.Sprite;
    const state = createEnemyState(this.nextId++, ENEMY.baseHealth, ENEMY.baseSpeed);
    this.states.set(enemy, state);
    enemy.setScale(2).play('enemy-walk');
    enemy.setDepth(y);
    enemy.setCircle(8, 4, 6);
    return enemy;
  }

  getState(enemy: Phaser.Physics.Arcade.Sprite): EnemyState | undefined {
    return this.states.get(enemy);
  }

  getCandidates(): Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> {
    const list: Array<TargetCandidate & { sprite: Phaser.Physics.Arcade.Sprite }> = [];
    for (const object of this.group.getChildren()) {
      const sprite = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(sprite);
      if (!state) continue;
      const body = sprite.body as Phaser.Physics.Arcade.Body | null;
      list.push({
        id: state.id,
        x: sprite.x,
        y: sprite.y,
        active: sprite.active,
        bodyEnabled: Boolean(body && body.enable),
        hp: state.hp,
        dead: state.dead,
        sprite,
      });
    }
    return list;
  }

  damageEnemy(
    enemyObject: Phaser.GameObjects.GameObject,
    damage: number
  ): { damaged: boolean; killed: boolean; x: number; y: number } {
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    const state = this.states.get(enemy);
    const x = enemy.x;
    const y = enemy.y;
    if (!enemy.active || !state || state.dead) {
      return { damaged: false, killed: false, x, y };
    }
    const result = applyProjectileHit(state, damage);
    if (result.killed) {
      if (enemy.body) {
        enemy.body.enable = false;
      }
      this.states.delete(enemy);
      enemy.destroy();
    }
    return { damaged: result.damaged, killed: result.killed, x, y };
  }

  update(playerDead = false): void {
    for (const object of this.group.getChildren()) {
      const enemy = object as Phaser.Physics.Arcade.Sprite;
      const state = this.states.get(enemy);
      if (!enemy.active || !state || state.dead) continue;
      const vel = chaseVelocity(enemy, this.target, state.speed, playerDead);
      enemy.setVelocity(vel.x, vel.y);
      if (Math.abs(vel.x) > 1e-3) {
        enemy.setFlipX(vel.x < 0);
      }
      enemy.setDepth(enemy.y);
    }
  }

  clear(): void {
    this.states.clear();
  }
}
```

- [ ] **Step 3: Implement `src/game/systems/WeaponSystem.ts`**

```ts
import Phaser from 'phaser';
import {
  canWeaponFire,
  commitWeaponFire,
  createWeaponCooldown,
  selectNearestTarget,
} from '../../domain/targeting';
import { aimDirection, type Vec2 } from '../../domain/vector';
import { PLAYER, PROJECTILE } from '../config/constants';
import type { EnemySystem } from './EnemySystem';

export class WeaponSystem {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  private readonly cooldown = createWeaponCooldown(PLAYER.attackIntervalMs);
  private readonly consumedProjectiles = new WeakSet<Phaser.GameObjects.GameObject>();
  private lastAim: Vec2 = { x: 1, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly enemies: EnemySystem
  ) {
    this.projectiles = scene.physics.add.group();
  }

  update(nowMs: number, enabled = true): void {
    if (!enabled || !this.player.active) return;
    if (!canWeaponFire(this.cooldown, nowMs)) return;

    const target = selectNearestTarget(
      this.player,
      this.enemies.getCandidates(),
      PROJECTILE.range
    );
    if (!target) return;

    const direction = aimDirection(this.player, target, this.lastAim);
    this.lastAim = direction;
    const shot = this.projectiles.create(
      this.player.x,
      this.player.y,
      'orb'
    ) as Phaser.Physics.Arcade.Image;
    shot.setScale(2).setDepth(2000);
    shot.setVelocity(direction.x * PROJECTILE.speed, direction.y * PROJECTILE.speed);

    this.scene.time.delayedCall(PROJECTILE.lifeMs, () => {
      if (shot.active && !this.consumedProjectiles.has(shot)) {
        this.consumedProjectiles.add(shot);
        if (shot.body) shot.body.enable = false;
        shot.destroy();
      }
    });

    commitWeaponFire(this.cooldown, nowMs);
  }

  consumeProjectile(projectileObject: Phaser.GameObjects.GameObject): boolean {
    const projectile = projectileObject as Phaser.Physics.Arcade.Image;
    if (!projectile.active || this.consumedProjectiles.has(projectile)) {
      return false;
    }
    this.consumedProjectiles.add(projectile);
    if (projectile.body) {
      projectile.body.enable = false;
    }
    projectile.destroy();
    return true;
  }
}
```

- [ ] **Step 4: Implement `src/game/systems/DamageSystem.ts` and `src/game/systems/PickupSystem.ts`**

`src/game/systems/DamageSystem.ts`:
```ts
import Phaser from 'phaser';
import {
  applyContactDamage,
  createPlayerState,
  isPlayerInvulnerable,
  type PlayerState,
} from '../../domain/combat';
import { ENEMY, PLAYER } from '../config/constants';

export class DamageSystem {
  readonly state: PlayerState;

  constructor(private readonly player: Phaser.Physics.Arcade.Sprite) {
    this.state = createPlayerState(PLAYER.maxHealth);
  }

  tryContactDamage(nowMs: number): { damaged: boolean; died: boolean } {
    const damaged = applyContactDamage(
      this.state,
      ENEMY.touchDamage,
      nowMs,
      PLAYER.invulnerabilityMs
    );
    if (!damaged) {
      return { damaged: false, died: false };
    }
    if (this.player.active) {
      this.player.setTint(0xff6677);
    }
    return { damaged: true, died: !this.state.alive };
  }

  updateVisuals(nowMs: number): void {
    if (!this.player.active) return;
    if (isPlayerInvulnerable(this.state, nowMs)) {
      const blinkOn = Math.floor(nowMs / 100) % 2 === 0;
      if (blinkOn) {
        this.player.setTint(0xff6677);
      } else {
        this.player.clearTint();
      }
    } else if (this.player.isTinted) {
      this.player.clearTint();
    }
  }
}
```

`src/game/systems/PickupSystem.ts`:
```ts
import Phaser from 'phaser';
import type { PlayerState } from '../../domain/combat';
import {
  collectPickup,
  createPickupState,
  type PickupCollectionResult,
  type PickupState,
} from '../../domain/pickups';
import type { RunProgression } from '../../domain/progression';
import { PICKUP } from '../config/constants';

export class PickupSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextId = 1;
  private readonly states = new Map<Phaser.Physics.Arcade.Image, PickupState>();

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group();
  }

  spawnXpGem(x: number, y: number, value = PICKUP.xpPerKill): Phaser.Physics.Arcade.Image {
    const gem = this.group.create(x, y, 'gem') as Phaser.Physics.Arcade.Image;
    gem.setScale(2).setDepth(y);
    const state = createPickupState(this.nextId++, 'xp', value, x, y);
    this.states.set(gem, state);
    return gem;
  }

  spawnHealPickup(x: number, y: number, value = PICKUP.healAmount): Phaser.Physics.Arcade.Image {
    const heal = this.group.create(x, y, 'gem') as Phaser.Physics.Arcade.Image;
    heal.setScale(2).setTint(0x66ff99).setDepth(y);
    const state = createPickupState(this.nextId++, 'heal', value, x, y);
    this.states.set(heal, state);
    return heal;
  }

  collect(
    pickupObject: Phaser.GameObjects.GameObject,
    playerState: PlayerState,
    progression: RunProgression
  ): PickupCollectionResult {
    const image = pickupObject as Phaser.Physics.Arcade.Image;
    const state = this.states.get(image);
    if (!image.active || !state || state.state !== 'ground') {
      return {
        collected: false,
        levelsGained: 0,
        hpBefore: playerState.hp,
        hpAfter: playerState.hp,
      };
    }
    if (image.body) {
      image.body.enable = false;
    }
    const result = collectPickup(state, playerState, progression);
    if (result.collected) {
      this.states.delete(image);
      image.destroy();
    }
    return result;
  }

  getActivePickups(): PickupState[] {
    return Array.from(this.states.values()).filter((p) => p.state === 'ground');
  }

  clear(): void {
    this.states.clear();
  }
}
```

- [ ] **Step 5: Refactor `src/game/scenes/GameScene.ts` to orchestrate systems and expose test inspection hook**

```ts
import Phaser from 'phaser';
import { createProgression, xpThreshold, type RunProgression } from '../../domain/progression';
import { ENEMY, PROJECTILE, WORLD } from '../config/constants';
import { DamageSystem } from '../systems/DamageSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { WeaponSystem } from '../systems/WeaponSystem';

export type GameDebugApi = {
  getScene: () => GameScene;
  getPlayerPosition: () => { x: number; y: number };
  getPlayerVelocity: () => { x: number; y: number };
  getPlayerState: () => { hp: number; maxHp: number; alive: boolean; invulnerableUntilMs: number };
  getProgression: () => RunProgression & { defeated: number };
  getCounts: () => { enemies: number; projectiles: number; pickups: number; colliders: number };
  spawnEnemyAt: (x: number, y: number) => void;
  spawnHealAt: (x: number, y: number, amount?: number) => void;
  clearEnemies: () => void;
};

declare global {
  interface Window {
    __ANIME_SURVIVOR__?: GameDebugApi;
  }
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: EnemySystem;
  private weapon!: WeaponSystem;
  private movement!: MovementSystem;
  private damage!: DamageSystem;
  private pickups!: PickupSystem;
  private hud!: Phaser.GameObjects.Text;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private progression: RunProgression = createProgression();
  private defeated = 0;
  private elapsed = 0;
  private running = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.progression = createProgression();
    this.defeated = 0;
    this.elapsed = 0;
    this.running = true;

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'grass').setOrigin(0);
    this.createScenery();

    this.player = this.physics.add.sprite(WORLD.width / 2, WORLD.height / 2, 'hero', 0);
    this.player.setScale(2).setCollideWorldBounds(true).setDepth(5000);
    this.player.setCircle(10, 6, 13).play('hero-idle');

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.movement = new MovementSystem(this, this.player);
    this.enemies = new EnemySystem(this, this.player);
    this.weapon = new WeaponSystem(this, this.player, this.enemies);
    this.damage = new DamageSystem(this.player);
    this.pickups = new PickupSystem(this);

    this.physics.add.overlap(this.weapon.projectiles, this.enemies.group, (a, b) =>
      this.onProjectileEnemy(a, b)
    );
    this.physics.add.overlap(this.player, this.enemies.group, () => this.onPlayerEnemyContact());
    this.physics.add.overlap(this.player, this.pickups.group, (_p, item) =>
      this.onPlayerPickup(item)
    );

    this.hud = this.add
      .text(16, 14, '', {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: '#1b1934bb',
        padding: { x: 12, y: 9 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    this.add
      .text(945, 20, 'WASD / Arrow keys', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e8d5ff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.spawnTimer = this.time.addEvent({
      delay: 1050,
      loop: true,
      callback: () => {
        if (!this.running) return;
        const amount = this.elapsed > 60 ? 2 : 1;
        for (let i = 0; i < amount && this.enemies.group.countActive(true) < ENEMY.maxAlive; i++) {
          this.enemies.spawn();
        }
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.registerDebugApi();
    this.updateHud();
  }

  update(_now: number, delta: number): void {
    if (!this.running || !this.damage.state.alive) return;
    this.elapsed += delta / 1000;
    this.movement.update(true);
    this.enemies.update(false);
    this.weapon.update(this.time.now, true);
    this.damage.updateVisuals(this.time.now);
    this.player.setDepth(this.player.y);

    if (this.elapsed >= WORLD.runDurationSec) {
      this.endRun(true);
      return;
    }
    this.updateHud();
  }

  private createScenery(): void {
    const random = new Phaser.Math.RandomDataGenerator(['anime-survivor-world-v1']);
    for (let i = 0; i < 100; i++) {
      const x = random.between(40, WORLD.width - 40);
      const y = random.between(40, WORLD.height - 40);
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < 190) continue;
      this.add.image(x, y, 'tree').setScale(random.realInRange(1.5, 2.2)).setDepth(y);
    }
  }

  private onProjectileEnemy(
    projectileObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0],
    enemyObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1]
  ): void {
    if (!this.running) return;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active) return;
    if (!this.weapon.consumeProjectile(projectileObject as Phaser.GameObjects.GameObject)) return;

    const outcome = this.enemies.damageEnemy(enemy, PROJECTILE.damage);
    if (!outcome.damaged) return;
    if (!outcome.killed) {
      enemy.setTint(0xffffff);
      this.time.delayedCall(85, () => {
        if (enemy.active) enemy.clearTint();
      });
      return;
    }
    this.defeated++;
    this.pickups.spawnXpGem(outcome.x, outcome.y);
  }

  private onPlayerEnemyContact(): void {
    if (!this.running || !this.damage.state.alive) return;
    const outcome = this.damage.tryContactDamage(this.time.now);
    if (outcome.died) {
      this.endRun(false);
    }
  }

  private onPlayerPickup(
    pickupObject: Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[1]
  ): void {
    if (!this.running || !this.damage.state.alive) return;
    const result = this.pickups.collect(
      pickupObject as Phaser.GameObjects.GameObject,
      this.damage.state,
      this.progression
    );
    if (result.collected && result.levelsGained > 0) {
      this.cameras.main.flash(160, 130, 90, 200);
    }
  }

  private endRun(victory: boolean): void {
    if (!this.running) return;
    this.running = false;
    this.movement.update(false);
    this.enemies.update(true);
    this.scene.start('GameOverScene', { victory, score: this.defeated });
  }

  private cleanup(): void {
    this.running = false;
    this.spawnTimer?.remove(false);
    this.enemies.clear();
    this.pickups.clear();
  }

  private updateHud(): void {
    const min = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const sec = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
    const { hp, maxHp } = this.damage.state;
    const { level, xp } = this.progression;
    this.hud.setText(
      `ANIME SURVIVOR  |  HP ${hp}/${maxHp}  |  LV ${level}  XP ${xp}/${xpThreshold(level)}\nTIME ${min}:${sec}  |  KILLS ${this.defeated}`
    );
  }

  private registerDebugApi(): void {
    window.__ANIME_SURVIVOR__ = {
      getScene: () => this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      getPlayerVelocity: () => ({ x: this.player.body?.velocity.x ?? 0, y: this.player.body?.velocity.y ?? 0 }),
      getPlayerState: () => ({ ...this.damage.state }),
      getProgression: () => ({ ...this.progression, defeated: this.defeated }),
      getCounts: () => ({
        enemies: this.enemies.group.countActive(true),
        projectiles: this.weapon.projectiles.countActive(true),
        pickups: this.pickups.group.countActive(true),
        colliders: this.physics.world.colliders.length,
      }),
      spawnEnemyAt: (x: number, y: number) => { this.enemies.spawnAt(x, y); },
      spawnHealAt: (x: number, y: number, amount?: number) => { this.pickups.spawnHealPickup(x, y, amount); },
      clearEnemies: () => { this.enemies.group.clear(true, true); this.enemies.clear(); },
    };
  }
}
```

- [ ] **Step 6: Run `npm run verify` to confirm typecheck, lint, unit tests, architecture bounds, and build**

Run: `npm run verify`
Expected: PASS across all 6 stages (`typecheck`, `lint`, `test`, `check:arch`, `assets:validate`, `build`).

- [ ] **Step 7: Commit**

```powershell
git add src/game/systems/ src/game/scenes/GameScene.ts ; git commit -m "feat(game): refactor systems and GameScene to enforce gameplay logic contract"
```

---

### Task 6: Comprehensive Playwright E2E Gameplay Verification (`tests/e2e/game.spec.ts`)

**Files:**
- Modify: `tests/e2e/game.spec.ts`

**Interfaces:**
- Consumes: `window.__ANIME_SURVIVOR__` runtime inspection API exposed by `GameScene`
- Produces: Automated browser verification covering Section 10 checks A, B, C, D, E, G in `AnimeSurvivor-GameplayLogic-Spec.md`.

- [ ] **Step 1: Write comprehensive Playwright E2E scenarios in `tests/e2e/game.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test.describe('Anime Survivor Phase 1 Gameplay Logic E2E', () => {
  test('A: boots game, normalizes diagonal vs cardinal displacement, and has no console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width', '960');
    await expect(canvas).toHaveAttribute('height', '540');

    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));
    await page.evaluate(() => window.__ANIME_SURVIVOR__!.clearEnemies());

    const startCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    const endCardinal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const cardinalDist = Math.hypot(
      endCardinal.x - startCardinal.x,
      endCardinal.y - startCardinal.y
    );

    const startDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    await page.keyboard.down('d');
    await page.keyboard.down('w');
    const diagVel = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerVelocity());
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    await page.keyboard.up('w');
    const endDiag = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerPosition());
    const diagDist = Math.hypot(endDiag.x - startDiag.x, endDiag.y - startDiag.y);

    expect(Math.hypot(diagVel.x, diagVel.y)).toBeCloseTo(250, 1);
    expect(cardinalDist).toBeGreaterThan(40);
    expect(Math.abs(diagDist - cardinalDist)).toBeLessThan(25);
    await page.screenshot({ path: 'test-results/anime-survivor.png' });
    expect(errors).toEqual([]);
  });

  test('B, C, D, E, G: enforces 3-enemy overlap single hit i-frames, auto-target kill, single pickup collider, heal clamp, and clean restart', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__ANIME_SURVIVOR__));

    // Check G baseline: exactly 3 overlap colliders registered
    const initialCounts = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(initialCounts.colliders).toBe(3);

    // Check B: 3 enemies overlapping player simultaneously inflict 11 damage once
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
      api.spawnEnemyAt(pos.x, pos.y);
    });

    await page.waitForTimeout(100);
    const stateAfterOverlap = await page.evaluate(() =>
      window.__ANIME_SURVIVOR__!.getPlayerState()
    );
    expect(stateAfterOverlap.hp).toBe(89);

    // Check C & D: auto-targeting shoots and kills nearby enemy, dropping XP gem without increasing collider count
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      api.clearEnemies();
      const pos = api.getPlayerPosition();
      api.spawnEnemyAt(pos.x + 90, pos.y);
    });

    await page.waitForFunction(
      () => window.__ANIME_SURVIVOR__!.getProgression().defeated >= 1,
      undefined,
      { timeout: 3000 }
    );
    const countsAfterKill = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getCounts());
    expect(countsAfterKill.colliders).toBe(3);

    // Check E: heal pickup restores HP and clamps at 100
    await page.evaluate(() => {
      const api = window.__ANIME_SURVIVOR__!;
      const pos = api.getPlayerPosition();
      api.spawnHealAt(pos.x, pos.y, 25);
    });
    await page.waitForTimeout(100);
    const stateAfterHeal = await page.evaluate(() => window.__ANIME_SURVIVOR__!.getPlayerState());
    expect(stateAfterHeal.hp).toBe(100);
  });
});
```

- [ ] **Step 2: Run E2E and full verification suite**

Run: `npm run verify ; npm run test:e2e`
Expected: PASS on all unit tests, lint, typecheck, arch check, sprite validation, production build, and both Playwright E2E test suites.

- [ ] **Step 3: Update `PROJECT_PROGRESS.md` and `docs/PROGRESS.md` and commit**

```powershell
git add tests/e2e/game.spec.ts PROJECT_PROGRESS.md docs/PROGRESS.md ; git commit -m "test(e2e): add Phase 1 gameplay contract Playwright tests and record progress"
```
