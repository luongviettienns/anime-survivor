# Progress / evidence log

## Prepared workspace (2026-10-27)
- [x] Architecture, game vision, skills, and exact-size art contract written.
- [x] Original procedural hero/enemy sprite sheets and environment primitives generated.
- [x] `python scripts/validate_sprites.py` passed pixel-by-pixel source/crop verification.
- [x] `node scripts/check-architecture.mjs` passed local architecture checks.
- [x] npm install / TypeScript / ESLint / Vitest / production build: VERIFIED.
  - Resolved TS strict typing issues in GameScene (`hp: number`, Phaser 4 overlap callback parameter types, `setTint` method replacement).
  - Configured `vitest.config.ts` to isolate unit tests from Playwright e2e specs.
  - `npm run verify` passed all 6 stages (`typecheck`, `lint`, `test`, `check:arch`, `assets:validate`, `build`).
- [x] Playwright smoke test / gameplay browser check: VERIFIED.
  - `npm run test:e2e` passed (boot, canvas dimensions 960x540, keyboard controls W/D, zero page errors).
  - Screenshot verified at `test-results/anime-survivor.png`.
## Phase 1: 60-second Playable Slice & Gameplay Logic Contract (2026-10-27)
- [x] Pure vector math, diagonal movement normalization, and coincident chase velocity verified (`src/domain/vector.ts`, `tests/vector.test.ts`).
- [x] Player contact damage, 800ms i-frames with `invulnerableUntilMs = -Infinity`, and idempotent enemy hit/kill verified (`src/domain/combat.ts`, `tests/domain.test.ts`).
- [x] Pure auto-targeting (range 520px, active/body/hp check, ID tie-break) and weapon cooldown (`nextAttackAtMs = -Infinity`) verified (`src/domain/targeting.ts`, `tests/targeting.test.ts`).
- [x] Single collection pickup state machine (`'xp' | 'heal'`), removal of level-up auto-heal, and upgrade queue verified (`src/domain/pickups.ts`, `src/domain/progression.ts`, `tests/pickups.test.ts`).
- [x] Systems refactored: `MovementSystem`, `EnemySystem`, `WeaponSystem`, `DamageSystem`, `PickupSystem`, `DebugBridge`, and `GameScene` with exactly 3 scene-level colliders.
- [x] `npm run verify` passed all 6 stages (18/18 Vitest tests passed, 0 lint/TS errors, architecture limits satisfied).
- [x] `npm run test:e2e` passed all browser scenarios (cardinal vs diagonal displacement, 3-enemy simultaneous overlap single hit, auto-target kill, single pickup collider count, heal clamp at 100, zero console errors).
- [x] Screenshot verified at `test-results/anime-survivor.png`.

## Next Roadmap
- [ ] Phase 2: Full Roguelite Core (WaveDirector, UpgradeChoiceScene, 3 enemy variants, 2 extra weapons, 10-minute boss, pause/resume).

Do not tick items without actual evidence. Update this log during every Antigravity session.
