# Gameplay Balance, Kage Bunshin & Combat Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (`define_subagent` + `invoke_subagent` with `Model: "flash"` under Hydrogen XHigh Orchestrator supervision + `ponytail-review`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 7 agreed gameplay/balance updates on branch `feat/update-gameplay`: rebalance Kirito Phantom Dash, Naruto Rasengan (Lv.2+ drill push, no pierce) and Paper Bomb Mine, replace Naruto's non-canonical `slash` with `clone` (Kage Bunshin Strike), remove `stat_max_hp` auto-heal, add nerfed `stat_recovery`, and switch combat crits to capped single-probability (`<= 30%`, `1.5x`).

**Architecture:** Pure deterministic formulas and level tables live in `src/domain/` (`phantomDash.ts`, `weapons.ts`, `clones.ts`, `upgrades.ts`, `combat.ts`) with zero Phaser/DOM imports. Thin stateful adapters (`CloneSystem.ts`, `WeaponSystem.ts`, `VfxSystem.ts`, `GameScene.ts`, `HudOverlay.ts`, `HudState.ts`) read domain outputs and pool Phaser sprites without adding per-frame allocations or breaking the 200-effective / 210-physical line ceiling. Existing PNG sprite assets (`hero`, `hero_actions`, `vfx_death`, `vfx_hit`, `rasengan`, `mine`) are 100% reused without modifying `ART_CONTRACT.json`.

**Tech Stack:** TypeScript (strict), Phaser 4, Vitest, Playwright, ESLint, `scripts/check-architecture.mjs`.

**Spec / Prior Decisions:** [docs/superpowers/plans/2026-11-19-gameplay-update-plan.md](2026-11-19-gameplay-update-plan.md) and [AGENTS.md](../../../AGENTS.md) (`Core Design Law: Asymmetric Identity & Dilemma`).

---

## Global Constraints

- **Pure Domain Rule:** `src/domain/*` MUST NOT import `phaser`, `window`, or DOM APIs.
- **Line Ceiling (CRITICAL):** ESLint enforces `<= 200` effective lines; `npm run check:arch` enforces `<= 210` physical lines (`GameScene.ts` is already at 200 lines; `upgrades.ts` is at 194; `EnemySystem.ts` is at 207 — keep changes lean or split by responsibility into `src/domain/clones.ts` and `src/game/systems/CloneSystem.ts`).
- **Asset Integrity:** Do NOT alter packed PNGs or `docs/ART_CONTRACT.json`; `npm run assets:validate` must stay 100% PASS. Reuse `'hero'`, `'hero_actions'`, `'vfx_death'`, `'vfx_hit'`, `'player_skill_hit'`.
- **Ponytail Discipline:** Minimal working code only; no wrappers, no unused flags, no leftover dead `slash` weapon logic. Every modified signature must update all callers in `src/` and `tests/`.
- **Exact Stat Tables (Verbatim):**
  - **Phantom Dash (`src/domain/phantomDash.ts`):**
    - Lv.1: `cooldownMs: 4500, damage: 65, searchRangePx: 300, maxDashPx: 220, pierceCount: 1, dashCount: 1`
    - Lv.2: `cooldownMs: 3800, damage: 90, searchRangePx: 340, maxDashPx: 280, pierceCount: 2, dashCount: 1`
    - Lv.3: `cooldownMs: 3200, damage: 110, searchRangePx: 380, maxDashPx: 340, pierceCount: 3, dashCount: 2`
    - Lv.4: `cooldownMs: 2800, damage: 140, searchRangePx: 420, maxDashPx: 400, pierceCount: 4, dashCount: 2`
    - Lv.5: `cooldownMs: 2400, damage: 175, searchRangePx: 460, maxDashPx: 460, pierceCount: 4, dashCount: 3`
    - `statusBonusDamage: 35`, `iframeMs: 400` (unchanged).
  - **Rasengan (`orb`):** Lv.1..5 damage `[32, 42, 52, 64, 78]`, cooldown `[760, 685, 610, 535, 460]`, count `[1, 1, 2, 2, 3]`, range `[440, 470, 500, 530, 560]`, speed `[420, 465, 510, 555, 600]`, knockback `[80, 220, 260, 300, 340]`. No pierce. Lv.2+ continuous drill push (`180ms` push / tick then final detonation).
  - **Paper Bomb Mine (`mine`):** Lv.1..5 damage `[75, 95, 115, 135, 160]`, cooldown `[900, 800, 700, 600, 500]`, count `[1, 1, 2, 2, 3]`, radius/range `[85, 98, 110, 122, 135]`, knockback `[260, 285, 310, 335, 360]`.
  - **Kage Bunshin (`clone`, replacing `slash`):** Lv.1..5 clone count `[1, 2, 3, 4, 4]`, damage per clone `[35, 40, 45, 50, 60]`, cooldown `[2200, 2000, 1800, 1600, 1400]`, trigger range `[140, 160, 160, 180, 180]`, sweep hit radius `[48, 48, 48, 52, 60]`, sweep arc `120 deg` (`cos >= 0.5`), `maxHitsPerClone: 2`, knockback `[180, 180, 180, 180, 200]` (non-stacking).
  - **`stat_max_hp`:** Only increases `player.maxHp += val`; NEVER modifies `player.hp`.
  - **`stat_recovery`:** Replaces `stat_heavy_strike` in `PassiveId` (retains 7 total passives). Values `[1, 2, 3, 4, 6]` HP every `3000ms` via pause-safe `deltaMs`.
  - **Crit Rules:** `MAX_CRIT_CHANCE = 0.30`, `CRIT_MULTIPLIER = 1.5` (`Math.ceil(dmg * 1.5)`), independent single probability `rng() < Math.min(Math.max(0, critChance), 0.30)` (ready for future Mục 3 crit buffs).

## Review Focus

1. **Pause-safe Recovery Timer:** `applyPassiveRecovery(player, passives, deltaMs)` advances only on simulation `deltaMs`, resets `recoveryTimerMs = 0` when `player.hp >= player.maxHp` (cannot bank burst heals at full HP), and returns `0` when dead or `recoveryPer3Sec <= 0`.
2. **Rasengan Drill Push Edge Cases:** At Lv.2+, if first hit kills the enemy immediately, orb detonates once without drilling a corpse; if enemy survives, orb locks onto that single enemy (never pierces a second enemy!), pushes along flight vector (`dir`), and detonates cleanly on target death, drill timeout, or expiry.
3. **Kage Bunshin Anti-Exploit Guards:** Clones only trigger when an alive enemy enters `triggerRangePx`, cap hits per clone at `2`, apply non-stacking knockback, and clean up active clones on `WeaponSystem.clear()` / `GameScene` shutdown.
4. **Crit Cap & Input Guard:** `critChance` of `NaN`, `< 0`, or `> 0.30` (e.g., `0.95`) is sanitized and strictly capped at `0.30` before calling `rng()`; `rng()` is not even relied on when `critChance <= 0`.
5. **Clean Caller Migration (`slash` & `stat_heavy_strike`):** Every unit test, E2E spec, HUD slot, and `BootScene` animation key referencing `'slash'` or `'heavyStrikeEvery'` is migrated without breaking TypeScript (`npm run typecheck`) or `npm run check:arch`.

---

## Task Breakdown

### Task 1: Phantom Dash Rebalance (`src/domain/phantomDash.ts` + `src/domain/upgrades.ts` desc)
**Files:**
- Modify: `src/domain/phantomDash.ts:6-34`
- Modify: `src/domain/upgrades.ts:34-40`
- Test: `tests/phantom-dash.test.ts`

**Interfaces:**
- Produces: Updated `DASH_LEVELS`, `PHANTOM_DASH.statusBonusDamage = 35`, updated `PHANTOM_DASH_DESCS`.

- [ ] **Step 1: Update failing assertions in `tests/phantom-dash.test.ts`**
  Assert new cooldowns `[4500, 3800, 3200, 2800, 2400]`, damages `[65, 90, 110, 140, 175]`, and `PHANTOM_DASH.statusBonusDamage === 35` + `+35` bonus in `computePhantomDashDamage`.
- [ ] **Step 2: Run `npx vitest run tests/phantom-dash.test.ts` — verify FAIL.**
- [ ] **Step 3: Update `DASH_LEVELS`, `PHANTOM_DASH.statusBonusDamage` in `src/domain/phantomDash.ts` and `PHANTOM_DASH_DESCS` in `src/domain/upgrades.ts`.**
- [ ] **Step 4: Run `npx vitest run tests/phantom-dash.test.ts` — verify PASS.**
- [ ] **Step 5: Commit `feat(balance): buff Kirito Phantom Dash DPS, cooldowns Lv1-5, and status bonus`.**

---

### Task 2: Remove Max-HP Heal, Add Nerfed `stat_recovery`, and Implement Capped Single-Probability Crit
**Files:**
- Modify: `src/domain/combat.ts` (`applyPassiveRecovery`, keeping `upgrades.ts` under ESLint 200-line cap)
- Modify: `src/domain/upgrades.ts`
- Modify: `src/ui/HudState.ts` & `src/ui/HudOverlay.ts:66`
- Modify: `src/game/systems/DamageSystem.ts` (call `applyPassiveRecovery` inside `updateVisuals(nowMs, passives?, deltaMs?)` so `GameScene.ts` adds 0 net lines!)
- Modify: `src/game/scenes/GameScene.ts:108` (`this.damage.updateVisuals(this.time.now, this.passives, delta);`)
- Test: `tests/weapons-upgrades.test.ts`, `tests/domain.test.ts`, Create: `tests/recovery-crit.test.ts`

**Interfaces:**
- Consumes: `PlayerState` (`src/domain/combat.ts`).
- Produces:
  - `PassiveId = 'stat_max_hp' | 'stat_damage_reduction' | 'stat_damage' | 'stat_cooldown' | 'stat_move_speed' | 'stat_magnet' | 'stat_recovery'`
  - `PassiveStats` with `recoveryPer3Sec: number`, `recoveryTimerMs: number`, `critChance: number` (removes `heavyStrikeEvery`, `heavyStrikeBonus`, `attackCounter`).
  - `MAX_CRIT_CHANCE = 0.3`, `CRIT_DAMAGE_MULTIPLIER = 1.5`
  - `applyPassiveRecovery(player: PlayerState, passives: { recoveryPer3Sec: number; recoveryTimerMs: number }, deltaMs: number): number` in `src/domain/combat.ts`
  - `rollCombatDamage(baseDamage: number, passives: PassiveStats, rng?: () => number): { damage: number; critical: boolean }`

- [ ] **Step 1: Write failing tests in `tests/recovery-crit.test.ts` & update `tests/weapons-upgrades.test.ts`**
  Test:
  1. `applyUpgradeChoice('stat_max_hp', ...)` increases `player.maxHp` from `100` to `260` while `player.hp` stays strictly `50` (never heals).
  2. `stat_recovery` Lv.1..5 grants `[1, 2, 3, 4, 6]` HP/3s.
  3. `applyPassiveRecovery` heals nothing before 3000ms, heals exact amount at 3000ms clamped to `maxHp`, resets `recoveryTimerMs = 0` at full HP, ignores `<= 0` or dead player.
  4. `rollCombatDamage` returns `Math.ceil((baseDamage + damageBonus) * 1.5)` when `rng() < Math.min(critChance, 0.30)`, never crits at `critChance = 0`, and strictly caps `critChance = 0.9` to `0.30` (e.g., `rng = () => 0.31` returns `critical: false`).
- [ ] **Step 2: Run `npx vitest run tests/recovery-crit.test.ts tests/weapons-upgrades.test.ts` — verify FAIL.**
- [ ] **Step 3: Implement changes cleanly in `src/domain/combat.ts`, `src/domain/upgrades.ts`, `src/ui/HudState.ts`, `src/ui/HudOverlay.ts`, `src/game/systems/DamageSystem.ts`, and `src/game/scenes/GameScene.ts:108`.**
- [ ] **Step 4: Update `tests/e2e/arcane-ui.spec.ts:95` & `tests/e2e/damage-popup-motion.spec.ts:61` (`passives.critChance = 0`) and `src/ui/HudOverlay.ts:66` cache key if needed.**
- [ ] **Step 5: Run `npm run typecheck && npm run test && npm run check:arch` — verify PASS.**
- [ ] **Step 6: Commit `feat(combat): remove level max-hp heal, add nerfed stat_recovery, and capped 30% crit`.**

---

### Task 3: Domain Model for `orb`, `mine` Rebalance & `clone` (Kage Bunshin Replacing `slash`)
**Files:**
- Create: `src/domain/clones.ts` (keeps `weapons.ts` and `CloneSystem.ts` lean!)
- Modify: `src/domain/weapons.ts`
- Modify: `src/domain/upgrades.ts` (`WEAPON_UPGRADE_META`, `UpgradeId`)
- Test: `tests/weapons-upgrades.test.ts`, `tests/kirito-unlocks.test.ts`, Create: `tests/clones.test.ts`

**Interfaces:**
- Produces:
  - `WeaponId = 'orb' | 'clone' | 'orbital' | 'mine' | 'dual_slash'`
  - `computeWeaponStats('orb' | 'mine' | 'clone', level)` returning exact rebalanced tables.
  - `CloneLevelSpec`, `ClonePlan`, `getCloneLevelSpec(level: number)`, `planCloneFormation(playerPos: Vec2, targetPos: Vec2, level: number): ClonePlan[]`, `isInsideSweepCone(clonePos: Vec2, dir: Vec2, enemyPos: Vec2, hitRadiusPx: number, arcCosMin: number): boolean` in `src/domain/clones.ts`.

- [ ] **Step 1: Write failing tests in `tests/clones.test.ts` and update `tests/weapons-upgrades.test.ts`, `tests/kirito-unlocks.test.ts`**
  Test:
  1. `createWeaponInventory()` -> `{ orb: 1, clone: 0, orbital: 0, mine: 0, dual_slash: 0 }`.
  2. `orb` Lv.1..5 damage `[32, 42, 52, 64, 78]`, knockback `[80, 220, 260, 300, 340]`.
  3. `mine` Lv.1..5 damage `[75, 95, 115, 135, 160]`, cooldown `[900, 800, 700, 600, 500]`, count `[1, 1, 2, 2, 3]`, range `[85, 98, 110, 122, 135]`.
  4. `clone` Lv.1..5: count `[1, 2, 3, 4, 4]`, damage `[35, 40, 45, 50, 60]`, cooldown `[2200, 2000, 1800, 1600, 1400]`, triggerRange `[140, 160, 160, 180, 180]`, hitRadius `[48, 48, 48, 52, 60]`.
  5. `planCloneFormation` spawns 1 behind/flank, 2 at `180°`, 3 at `120°`, 4 at `90°` at radius `58px` around target with staggered `launchDelayMs` (`0, 40, 80, 120`).
  6. `isInsideSweepCone` hits point-blank (`<= 16px`), hits inside `120°` forward cone (`cos >= 0.5`), rejects behind clone or outside `hitRadiusPx`.
- [ ] **Step 2: Run `npx vitest run tests/clones.test.ts tests/weapons-upgrades.test.ts tests/kirito-unlocks.test.ts` — verify FAIL.**
- [ ] **Step 3: Implement `src/domain/clones.ts` and update `src/domain/weapons.ts` + `src/domain/upgrades.ts`.**
- [ ] **Step 4: Run `npm run test` — verify pure domain tests PASS (update any compile errors in game systems in Task 4 & 5, or keep Task 3+4 atomic if TypeScript needs callers updated).** *(Orchestrator note: `npm run typecheck` checks `src/` + `tests/` together, so Task 3 + Task 4/5 can be committed per pure-domain green vitest and finished before running global `typecheck`.)*

---

### Task 4: Naruto Mine 3-Tag Spread & Rasengan Lv.2+ Drill Push (`MineSystem.ts`, `WeaponSystem.ts`)
**Files:**
- Modify: `src/game/systems/MineSystem.ts`
- Modify: `src/game/systems/WeaponSystem.ts`

**Interfaces:**
- Consumes: `computeWeaponStats('orb' | 'mine', level)`, `EnemySystem.damageEnemy`.

- [ ] **Step 1: Update `MineSystem.ts`**
  Support `stats.count === 3` placement spread (`[-22, 0, 22]` lateral offsets behind player, plus slight arc stagger) and raise max active mines cap from `10` to `12`.
- [ ] **Step 2: Implement Rasengan Drill Push (Lv.2+) in `WeaponSystem.ts`**
  Keep `WeaponSystem.ts` under 170 lines:
  - Add private `orbDrills = new Map<Sprite, { target: Sprite; dir: Vec2; nextTickAtMs: number; finalDamage: number; knockbackPxSec: number }>()`, tracking shot flight `dir` on `spawnOrb` (or from `shot.body.velocity`).
  - Inside `update(nowMs, ...)`: advance active `orbDrills`: if `!drill.target.active`, call `playRasenganHit(shot.x, shot.y)` and `consumeProjectile(shot)`; else follow `drill.target` contact front until `nowMs >= drill.nextTickAtMs`, then deal final tick `damageAndReward(drill.target, drill.finalDamage, drill.knockbackPxSec, sourcePos)` + `playRasenganHit` + `consumeProjectile(shot)`.
  - On `handleProjectileHit` for `'orb'`:
    - If `orbDrills.has(proj)`, ignore overlapping OTHER enemies (enforces no pierce!).
    - If `orbLevel === 1`: instant `playRasenganHit`, `damageAndReward`, `consumeProjectile`.
    - If `orbLevel >= 2`: deal `45%` initial tick + knockback along `dir` (`sourcePos = { x: enemy.x - dir.x * 32, y: enemy.y - dir.y * 32 }`). If killed immediately, play `playRasenganHit` & `consumeProjectile`. Otherwise attach drill (`nextTickAtMs = this.lastNowMs + 160` tracked from `update(nowMs, ...)`, `finalDamage = Math.ceil(stats.damage * 0.65)`, zero projectile auto-velocity while attached), and ensure `projectileExpiresAt` extends past `nextTickAtMs + 40`.
  - Clear `orbDrills` inside `consumeProjectile` and `clear()`.
- [ ] **Step 3: Verify `WeaponSystem.ts` line count `< 175` and clean behavior.**

---

### Task 5: Implement `CloneSystem.ts` & Wire `clone` into Game Systems + Migrate Callers
**Files:**
- Create: `src/game/systems/CloneSystem.ts`
- Modify: `src/game/systems/VfxSystem.ts` (add `playSmokePoof(x, y)`)
- Modify: `src/game/systems/WeaponSystem.ts` (remove `updateSlash` / `slashCooldown`, call `this.clones.update(...)`)
- Modify: `src/game/scenes/BootScene.ts` (add `'hero-skill-clone'` & `'naruto-action-clone'` animation aliases)
- Modify: `src/game/systems/MovementSystem.ts` & `src/game/systems/HeroActionVisual.ts`
- Modify: `src/ui/HudOverlay.ts:11-15,66` (slot `{ id: 'clone', label: 'CLONE', icon: 'icon-weapon_slash' }`)
- Modify: `tests/kirito-animation-priority.test.ts:50` (`'clone'` instead of `'slash'`)
- Modify impacted E2E specs (`tests/e2e/game.spec.ts`, `tests/e2e/skill-animation.spec.ts`, `tests/e2e/asset-overhaul.spec.ts`, `tests/e2e/kirito.spec.ts`, `tests/e2e/kirito-unlocks.spec.ts`, etc. replacing `slash` inventory key with `clone` and updating mine Lv.1 kill expectation where Slime 50 HP now dies to 75 Dmg mine)

- [ ] **Step 1: Add `playSmokePoof(x: number, y: number)` to `src/game/systems/VfxSystem.ts` reusing `vfx_death` / `vfx-death-poof`.**
- [ ] **Step 2: Create `src/game/systems/CloneSystem.ts` (`<= 140` lines)**
  - Pool of up to 4 `'hero'` sprites (`alpha: 0.85`, `scale: 2`, subtle chakra tint `0xc7f0ff`).
  - FSM (`delay` -> `spawn` with `playSmokePoof` -> `dash` at `450 px/s` -> `strike` checking `isInsideSweepCone`, capping `maxHitsPerClone: 2`, applying non-stacking knockback & `vfx.playPlayerSkillHit` -> `despawn` with `playSmokePoof`).
  - Exposes `update(nowMs, deltaMs, level, passives, candidates)` and `clear()`.
- [ ] **Step 3: Wire `CloneSystem` in `WeaponSystem.ts`, remove `slash` logic, update `BootScene.ts`, `MovementSystem.ts`, `HeroActionVisual.ts`, `HudOverlay.ts`.**
- [ ] **Step 4: Update all remaining `slash` references in unit + E2E tests.**
- [ ] **Step 5: Run full verification: `npm run verify` (`typecheck`, `lint`, `test`, `check:arch`, `assets:validate`, `build`) — verify 100% PASS.**
- [ ] **Step 6: Run targeted + full Playwright E2E suite (`npm run test:e2e`) and inspect gameplay visually on an isolated port (`5179`) protecting port `5173`.**
- [ ] **Step 7: Update `PROJECT_PROGRESS.md` & `docs/GAME_BALANCE_SHEET.md` / `docs/GAME_DESIGN.md` and commit.**

---

## Execution Workflow (Hydrogen XHigh Orchestrator + Flash Coder)

1. **Plan Approval**: User reviews this detailed plan and confirms the 2 Ponytail rulings below.
2. **Task-by-Task Delegation**:
   - Define `coder` subagent (`define_subagent(EnableWriteTools: true)`), invoke with `Model: "flash"` per task (Task 1 $\rightarrow$ Task 5).
   - After each task completes: Orchestrator (Hydrogen XHigh) inspects the actual `git diff`, runs `ponytail-review` audit (bugs, edge cases, caller sync, line limits, no bloat), triggers fix loop if needed, and gates before the next task.
3. **Final Verification Gate**: Orchestrator verifies `npm run verify`, `npm run test:e2e`, updates `PROJECT_PROGRESS.md`, and provides final review report.
