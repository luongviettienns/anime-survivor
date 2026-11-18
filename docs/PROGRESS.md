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
- [x] Integrated 11 specialized GameDev and Blender skills in `.agents/skills/` (`blender-tooling`, `blender-modeling`, `blender-animation`, `tech-art`, `game-design`, `game-ai`, `game-performance`, `game-ui`, `playtesting`, `game-audio`, `production-planning`).
- [x] Upgraded Hero to Naruto Shippuden (Option 2: black/orange high-collar tracksuit, flowing black headband tails, 4-frame breathing idle + 4-frame forward-leaning Naruto Run with swept-back arms), Rasengan `orb.png`, and Rogue Shadow Ninja `enemy.png` (`scripts/naruto_shippuden_art.py`, `scripts/blender_render_shinobi.py`, `art/source/naruto_shippuden.blend`).
- [x] `npm run verify` and `npm run test:e2e` re-verified (18/18 vitest, 2/2 e2e passed).

## Phase 2: Full Roguelite Core (2026-10-28)
- [x] Pure domain modules implemented and verified:
  - `src/domain/weapons.ts`, `src/domain/upgrades.ts` (`tests/weapons-upgrades.test.ts` — 5/5 passed).
  - `src/domain/enemies.ts`, `src/domain/waves.ts` (`tests/waves-enemies.test.ts` — 5/5 passed).
  - `src/domain/storageSchema.ts` (`tests/storage.test.ts` — 4/4 passed).
  - Magnetic pickup attraction (`computePickupMagnetVelocity` in `src/domain/pickups.ts`, `tests/pickups.test.ts` — 5/5 passed).
- [x] Game systems & scenes refactored under 160-line modular architecture:
  - `WeaponSystem.ts` (Rasengan `orb` fan spread, Kunai `slash` arc with knockback, Shadow Shuriken `orbital` ring, pooled projectiles).
  - `EnemySystem.ts` + `HostileProjectilePool.ts` (`slime`, `shade` fast flanker, `mage` ranged telegraph/caster, 10-minute `boss` Crimson Archon 8-way radial burst, zero-allocation candidate buffer).
  - `PickupSystem.ts` (object pooling + magnetic attraction), `StorageSystem.ts` (LocalStorage high scores & settings).
  - `HudOverlay.ts`, `TitleScene.ts`, `UpgradeScene.ts`, `PauseScene.ts`, `GameOverScene.ts` (Victory & Defeat states).

## Phase 3: Art & Polish (2026-10-28)
- [x] Deterministic pixel-art pipeline expanded (`scripts/shinobi_enemies_weapons_art.py`, `scripts/generate_assets.py`, `docs/ART_CONTRACT.json`):
  - `enemy_shade` (4 frames, 24x24), `enemy_mage` (4 frames, 24x24), `boss` (4 frames, 48x48), `shuriken` (12x12), `slash` (28x20), `enemy_bolt` (8x8).
  - `python scripts/validate_sprites.py` verified pixel-identical crops across all 5 animated spritesheets and all static textures.
- [x] Procedural 16-bit PCM `.wav` sound effects generated deterministically (`scripts/generate_audio.py`: `shoot.wav`, `slash.wav`, `hit.wav`, `pickup.wav`, `levelup.wav`, `hurt.wav`) and managed by `AudioSystem.ts` with polyphony voice caps (`src/domain/vfx.ts`, `tests/vfx-audio.test.ts` — 5/5 passed).
- [x] Pooled floating damage numbers (24-slot ring buffer) and particle burst VFX implemented in `VfxSystem.ts` with accessibility toggles (`reduceFlashing`, `reduceScreenShake`, `muted`, `volume`).

## Phase 4: QA, 120+ Enemy Stress Benchmark & Static Deployment Readiness (2026-10-28)
- [x] Expanded `DebugBridge.ts` (`spawnSwarm`, `getFrameDeltaMs`) and `tests/e2e/game.spec.ts` (5 comprehensive E2E test suites covering Phases 1–4).
- [x] 120-enemy stress benchmark verified in headless Chromium (`test('H: 120-enemy stress benchmark maintains stability, pooling, and zero console errors under heavy combat')`):
  - Spawned 120 active enemies across `'slime'`, `'shade'`, `'mage'` with all 3 weapons (`orb`, `slash`, `orbital`) upgraded and firing simultaneously.
  - Verified `colliders === 3`, `activeDamageTexts <= 24`, `frameDeltaMs < 100`, active enemy cap `<= 130`, player alive & responsive, and `0` console/page errors.
  - Representative stress combat screenshot captured and inspected at `test-results/anime-survivor.png`.
- [x] Full verification suite passed:
  - `npm run assets:generate` -> PASS (spritesheets + audio generated & packed).
  - `npm run verify` -> PASS (`typecheck`, `lint`, `vitest` 8 test files / 40 tests passed, `check:arch` OK, `assets:validate` OK, `vite build` to `dist/`).
  - `npm run test:e2e` -> PASS (5/5 Playwright E2E scenarios passed).

Do not tick items without actual evidence. Update this log during every Antigravity session.

## Naruto AI sprite integration (2026-11-18, in progress)
- Behavior: replace hero artwork with the approved Naruto reference, idle breathing and running, retaining WASD/arrows and horizontal facing.
- Files: hero source frames, deterministic hero import module, generate_assets.py hero branch, packed hero/manifest, provenance, animation browser test.
- Acceptance: 32x32 RGBA, shared palette/anchor, no edge contact; pixel-identical sheet crops; idle/run switch and left/right facing; verify and browser gameplay/logs/screenshots.
- Scope: user explicitly requested Naruto fan-art in this local game; no publication rights claimed. Existing unrelated working changes remain untouched.

### Naruto integration verification result
- Completed shared-palette 32x32 hero, 4 idle slots (2 held poses), 4 distinct running frames and deterministic asset regeneration. Existing animation controls retained.
- PASS: 3 Python asset tests; sheet pack/validation (23 sheets); npm run verify (43 Vitest tests, typecheck/lint/arch/build); npm run test:e2e (6/6 Chromium scenarios, zero console/page errors).
- Inspected running and idle screenshots under test-results/. Locked running upper body to eliminate AI head drift.
- Not checked: human review, other browsers, deployment. Existing Vite bundle-size warning remains. No up/down-specific poses added.
