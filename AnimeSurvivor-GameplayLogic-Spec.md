# Anime Survivor — Gameplay Logic Contract v1.0

> Target: existing Anime Survivor starter (Phaser 4 + TypeScript + Arcade Physics).
> Purpose: eliminate ambiguous implementation choices, regressions, speed bugs, duplicated hits and memory leaks. This document is the contract; update implementation and tests to satisfy it.

## 0. Existing starter: current findings (not yet fixed)

- `MovementSystem.ts`: already normalizes diagonal input with `Math.hypot`, which is correct; keep its outcome. Avoid unnecessarily reimplementing it.
- `EnemySystem.ts`: uses `unitDirection` and chase velocity, but `unitDirection` currently returns `(1, 0)` for coincident positions: change this behavior to `(0, 0)` for movement, and choose a separate aim fallback if needed.
- `WeaponSystem.ts`: selects nearest from a Group but needs `active`, body and HP filtering. `lastAttackMs = 0` prevents shots during the initial cooldown; decide that first shot is allowed immediately when a valid target exists.
- `GameScene.ts`: `lastHurt = 0` prevents hits during the initial 800 ms; replace with an explicit `invulnerableUntilMs` initialized to `-Infinity`.
- `GameScene.ts`: registers one `physics.add.overlap(player, gem, ...)` per gem. Replace with **one** group overlap collider for all pickups.
- `GameScene.ts`: XP level-ups currently auto-heal HP. Remove this unless it becomes an explicitly selected upgrade. HP healing comes from health pickups by default.
- Existing configuration: player speed 250; max HP 100; fire interval 380 ms; projectile speed 560, damage 28, lifetime 1400 ms; enemy speed 94, HP 50, contact damage 11; attack radius currently 520; enemy cap 130; run duration 600 s. These are default design values, not magic numbers sprinkled across modules.

## 1. Source architecture & ownership

Core: `src/domain/vector.ts` (pure vector helpers), `src/domain/combat.ts` (clamp/health/damage rules), `src/domain/progression.ts` (XP thresholds and multiple level ups), `src/domain/targeting.ts` (nearest valid target from plain structs), `src/domain/pickups.ts` (pickup effects & clamp).

Adapters: `src/game/systems/MovementSystem.ts`, `EnemySystem.ts`, `WeaponSystem.ts`, `DamageSystem.ts`, `PickupSystem.ts`, `ProgressionSystem.ts` (add only when meaningful). `GameScene` wires systems and collision callbacks. `src/game/config/constants.ts` owns balancing values and units.

- Domain imports **no Phaser**. Phaser systems may import domain.
- One source of truth for player HP, level/XP, dead/alive and invulnerability. Do not duplicate mutable state between Scene and systems.
- Scene owns one active game run. Dispose timers, colliders, event subscriptions and entities at scene shutdown. Replaying must reset them.
- Prefer typed interfaces and explicit state to untyped `getData` strings for growing systems.
- Modules should normally stay below 200 lines; split by responsibility, not mechanically by line count.

## 2. Units and time model

- Positions: world pixels (`px`). Velocities: `px / sec`. Delays/durations: **milliseconds** (`ms`). `deltaMs` from Scene update is milliseconds.
- With Arcade Physics, call `setVelocity(vx, vy)`; NEVER multiply that velocity by `deltaMs` or `deltaMs / 1000` again.
- For non-physics interpolation/magnetism only: `deltaSeconds = Math.min(deltaMs, 50) / 1000`; use `position += velocity * deltaSeconds`.
- Use `scene.time.now` consistently for cooldowns/invincibility and `scene.time.delayedCall` for timers. Do **not** use `Date.now()` or `setTimeout` for gameplay. Scene Clock pauses with the scene (Phaser docs).
- All system calls must respect paused, dying, game-over and upgrade-choice states; simulation must not silently advance while menus pause play.
- Staggered timer callbacks cannot resurrect/recolor destroyed sprites; guard `sprite.active` and scene lifecycle.

## 3. Player movement (8 directions)

Input horizontal: `Number(right) - Number(left)`; vertical: `Number(down) - Number(up)`. Each direction combines keyboard alternatives with **OR** (`W` OR up-arrow), not addition, so duplicate bindings do not double speed. Opposites cancel. Analog input, if added later, clamps vector length to at most 1; don't blindly normalize small analog magnitudes.

```ts
export type Vec2 = { x: number; y: number };
export function normalized(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len <= 1e-6 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}
export function movementVelocity(input: Vec2, speedPxSec: number): Vec2 {
  const d = normalized(input);
  return { x: d.x * speedPxSec, y: d.y * speedPxSec };
}
```

With speed = 250: (1,0) -> (250,0); (1,1) -> approx (176.777,176.777); (0,0) -> (0,0); (-1,1) -> (-176.777,176.777). All nonzero digital-input vectors have magnitude 250. At world edges use physics bounds, not manual teleport each frame.

Animation: use idle if no movement; walk otherwise. Change animation only if target animation differs / preserve playback without restarting frame zero. Update horizontal facing only when horizontal direction is nonzero, so facing is retained while idle / moving vertically. Sprite render facing is separate from movement direction. Frame rate must not change speed.

## 4. Enemy chase (basic enemy v1)

For each active, alive enemy with enabled body:

```ts
const dx = player.x - enemy.x;
const dy = player.y - enemy.y;
const d = Math.hypot(dx, dy);
if (d <= 1e-6 || playerDead) enemy.setVelocity(0, 0);
else enemy.setVelocity(dx / d * enemy.speed, dy / d * enemy.speed);
```

- Use individual enemy speeds, not the player's speed and not hardcoded 94 in a system.
- Enemy heading is updated toward the **current** player position each physics tick.
- Enemies do not multiply velocity by `deltaMs`.
- Enemy and player overlap triggers contact-damage consideration; don't use a solid collider that pushes player around unless specifically designed.
- Enemy must stop chasing when player dies, Scene pauses or enemy is dead.
- At identical coordinates, stop; do not default to horizontal movement.
- Spawn just beyond camera viewport when possible, within world bounds, and at least a minimum distance from player. If there is no valid spawn location near a world edge, try alternative samples or defer spawn; never place an enemy directly atop the player by clamping a single spawn position.
- For v1 allow overlap between multiple enemies. Do NOT implement naive all-pairs enemy separation O(N^2); introduce spatial grid only if crowd separation is required later.
- On enemy HP <= 0: immediately mark dead/deactivate body, award ONE kill, spawn ONE gem, optionally spawn one heal pickup according to a configured drop policy, and dispose/deactivate enemy. All duplicate hit callbacks must be harmless.

## 5. Weapon auto-target and projectiles

Default attack range = 520 px; fire interval = 380 ms; projectile speed = 560 px/sec; damage = 28; TTL = 1400 ms; target is the **nearest valid living enemy within range** at the moment of firing.

Eligibility:
- `enemy.active === true`, `enemy.body?.enable === true` (or equivalent verified current Phaser API), and `enemy.hp > 0` / `!enemy.dead`.
- Enemy has finite coordinates; exclude the player and other non-enemy entities.
- Distance squared `d2 = (ex-px)^2+(ey-py)^2`, candidate only if `d2 <= range*range`.
- Tie-break within a small epsilon by stable incrementing spawn ID (`enemy.id`), not arbitrary array iteration changes.

Algorithm: if `now < nextAttackAtMs`, return. On ready, find target; if none, do not spawn projectile or consume cooldown; retry on next update. If found, compute `normalized(targetPos-playerPos)` and spawn **one** projectile (unhomed v1) using aim direction at firing time. If positions coincide (`d <= 1e-6`), use a remembered last nonzero aiming vector or a deterministic `(1,0)` **for aiming only**. Set velocity `direction * PROJECTILE.speed`. Then `nextAttackAtMs = now + interval`. Initialize next attack so first valid shot can fire immediately; do not reset cooldown every time no target exists.

On projectile/enemy overlap:
1. Guard projectile active/unconsumed and enemy active/alive.
2. Mark projectile consumed/deactivate body immediately so a single projectile cannot damage multiple times from duplicate overlap callbacks.
3. Decrease enemy HP by attack damage, clamped to 0.
4. If HP == 0, invoke idempotent enemy-death handler once.
5. Destroy or return projectile to pool. TTL also deactivates projectile if it never hit; canceled/late timer must not mutate a recycled object (generation token or owner-managed timer when pooling).

For prototype, `destroy()` per projectile is acceptable. Consider pooling only if profiling shows GC/frame cost. Projectiles cannot travel forever, cannot continue to damage after being consumed, and do not retarget after launch. Recheck target only at firing instant, never assume an object is still active later.

## 6. Player contact damage + i-frames

Defaults: HP=100; contact damage=11; i-frame duration=800 ms.

Store:
```ts
playerState = {
  hp: 100, maxHp: 100, alive: true,
  invulnerableUntilMs: Number.NEGATIVE_INFINITY,
};
```

Damage acceptance rule:

```ts
function applyContactDamage(state: PlayerState, amount: number, nowMs: number) {
  if (!state.alive || nowMs < state.invulnerableUntilMs || amount <= 0) return false;
  state.hp = Math.max(0, state.hp - amount);
  state.invulnerableUntilMs = nowMs + 800;
  if (state.hp === 0) state.alive = false;
  return true;
}
```

- The first hit is possible at time 0. Never initialize lastHit = 0 and then compare `now-lastHit < 800`.
- Exactly `now == invulnerableUntilMs`: the next hit is allowed.
- Simultaneous overlaps with 3 enemies within a physics step inflict **one** accepted instance of contact damage because invulnerability is set synchronously on the first accepted contact.
- HP is always clamped `[0,maxHP]`. Reject NaN, Infinity and negative amounts at domain boundaries; avoid implicit JS coercions.
- Visual flashing/tint lasts only while invincible (can blink every 100 ms), and removing tint on death/scene shutdown is safe. Visual effect does not control actual invulnerability state.
- I-frames apply to contact damage; pickups continue to work, movement/attacks continue to work unless the game is paused or dead. Healing does not cancel i-frames.
- Death is one-time: state -> `gameover`, stop movement/fire/spawns, disable further callbacks, show game-over only once, and do not allow delayed timers to revive the player.
- Damage from projectiles/other sources should later pass through a central DamageSystem with an explicit damage-type policy, not silently create new independent i-frame states.

## 7. Pickup collection: XP gems and HP healing

Use ONE `physics.add.group()` shared for collectibles and ONE scene-level `physics.add.overlap(player, pickupGroup, callback)` registration; NEVER register one collider per gem. Every pickup has a stable unique ID, type (`'xp' | 'heal'`), value, state (`'ground' | 'collected'`) and world position. Alternative separate pickup groups are fine if intentionally justified and still O(number of pickup types) colliders, not O(number of gems).

Drop rules v1: one XP gem on each killed enemy (value 1 by default). Heal item is distinct from XP; for a demonstrable prototype, drop a heal item from a deterministic setup/test map, and optionally enable a configured low random drop chance later. Do not heal automatically on level-up unless that is a chosen upgrade.

At collection:
1. Reject if game not running, player dead, or pickup already consumed.
2. Mark pickup collected + disable physics body IMMEDIATELY (atomically) to prevent duplicate collections.
3. XP: call existing `awardXp(progress, value)`; handle multiple gained levels; enqueue one upgrade choice per gained level instead of silently skipping them. Existing threshold remains `3 + level * 2` unless balance is deliberately changed.
4. Heal: `hp = Math.min(maxHp, hp + healValue)`; use `healValue=25` as initial default. If HP already full, pickup is still consumed (do not repeatedly trigger it).
5. Update UI once (or publish one state-changed event); destroy/deactivate pickup.

Optional magnet: `magnetRadius = 96 px`, `collectRadius` determined by physics-body collision or ~18 px. Once inside magnet radius, move toward player at 220 px/sec using `(direction * speed * deltaSeconds)` if manually moving a non-dynamic image. Use a physics velocity instead if pickup is an Arcade body; do not apply both. Magnet movement must not overshoot when d < move step. For v1 keep simple overlap pickups first; implement magnet only after normal collection is correct.

Upgrades: if XP grants multiple levels at once, queue multiple choices. Display a separate upgrade UI Scene while `GameScene` is paused; resume only after all queued upgrades have been applied. XP award / scene pause cannot cause duplicate UI windows. Prevent cooldowns, enemies and i-frame timers from progressing while paused.

## 8. Collision callbacks and order of operations

Register once in Scene.create():

```ts
physics.add.overlap(weapon.projectiles, enemies.group, onProjectileEnemy);
physics.add.overlap(player, enemies.group, onPlayerEnemyContact);
physics.add.overlap(player, pickupSystem.group, onPlayerPickup);
```

All three callbacks start with `if (!gameState.running) return` and active/body validation. For each object, `alive/consumed/collected` transitions must be *synchronous and idempotent*. No collision callback registers another callback, spawns an unbounded timer chain or calls `scene.start` multiple times.

For simultaneous fatal contact and healing pickup: callbacks' ordering can vary. Define and test one policy. Preferred: queue overlap events for resolution at one consistent point each tick, and resolve **ground pickups / heal first, contact damage second, game-over last**. Freshly dropped gems are collectible on a later physics step. A simpler direct-callback implementation is acceptable for the prototype only if the same-frame interaction policy is explicitly documented and tested. Do not claim deterministic priority without implementing it.

## 9. Configuration defaults (define only in config)

```ts
export const PLAYER = {
  speed: 250, maxHealth: 100,
  invulnerabilityMs: 800, pickupMagnetRadius: 96,
  pickupMagnetSpeed: 220,
  attackIntervalMs: 380,
} as const;
export const ENEMY = {
  baseHealth: 50, baseSpeed: 94,
  touchDamage: 11, maxAlive: 130,
} as const;
export const PROJECTILE = {
  speed: 560, damage: 28, lifeMs: 1400,
  range: 520,
} as const;
export const PICKUP = { xpPerKill: 1, healAmount: 25 } as const;
```

Balance should be configurable; systems shouldn't duplicate literals.

## 10. Required automated tests

Pure unit tests (Vitest):

1. `movementVelocity`: (1,0), (0,1), (1,1), (-1,-1) all magnitude `speed`; zeros -> zeros; (right+left) -> x0; same velocity across frame rates by physics integration.
2. `normalized`: coincident -> (0,0), not (1,0); safe with zero vector.
3. `chase`: an enemy at (0,0) chasing (3,4) at speed 100 yields (60,80); same coordinates -> (0,0).
4. `targeting`: nearest alive valid target, skips dead/inactive/outside range; no targets -> null; equal distance -> smaller stable spawn ID.
5. `weapon`: first eligible shot can fire; cooldown at 379ms blocks, at 380ms permits; no target doesn't spend cooldown; bullet doesn't retarget after launch.
6. `damage`: hit at time0 accepted; second hit at t0 and t799 rejected; hit t800 accepted; hp clamps at 0; several overlaps only one accepted hit; heal does not reset invincibility.
7. `xp`: gain XP with overflow correctly; multiple levels queued; no premature health gain; pickup collected exactly once.
8. `heal`: 90 + 25 = 100; 100 + 25 = 100; pickup can only be consumed once.
9. `death`: enemy kill count and XP drop once with two projectiles same frame; player death/gameover transition once; destroyed object never targeted again.

Browser/Playwright checks (run at 30/60 FPS conditions where possible; also try a throttled profile):

A. Move straight vs diagonal for same duration: equal displacement magnitude within reasonable Arcade Physics precision.
B. 3 enemies overlap player: HP decreases 11 once, doesn't lose more for 800ms; may lose 11 again after expiry if still overlapping.
C. Nearest live enemy receives a shot; out-of-range enemy isn't selected; killing target doesn't stop future shots at remaining enemies.
D. Killing 2 enemies creates exactly 2 gems; picking one adds XP exactly once; pickup collider count stays constant.
E. Healing pickup clamps HP at max and can be collected once.
F. Pause/upgrades freeze enemies, timers and attacks; resume behaves correctly.
G. Scene restart several times does not multiply callbacks, clocks, overlaps or spawners; no growing piles of inactive game objects.

## 11. Implementation sequence / acceptance gate

1. Extract pure `vector`, `targeting`, `damage`, `pickup` helpers + Vitest tests; preserve existing movement behavior.
2. Correct enemy chase zero-distance / active filtering / spawn validity.
3. Correct targeting, first-shot cooldown, inactive enemy filtering and projectile hit consumption.
4. Introduce central player damage state and i-frame logic; verify time-zero and multiple overlaps.
5. Introduce pickup group, single overlap and separate healing pickup; remove XP autoheal.
6. Add optional magnet and upgrade queue only once baseline is stable.
7. Add Playwright gameplay tests, run screenshot/console checks, inspect animation and FPS.
8. Execute `npm run verify`, `npm run test:e2e`, record actual outputs in `docs/PROGRESS.md` and only then report completion.

**DO NOT:** redesign from scratch; add an unrelated framework; introduce React/NestJS; silently change game balance; implement O(N^2) neighbor loops; make scene a giant file; falsely claim tests run; switch to `setTimeout`/`Date.now` for gameplay; confuse millisecond and second units; multiply `setVelocity()` by delta.
