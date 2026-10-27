# Vertical slices — agent implementation plan

## Phase 0: Environment
- Verify Git, Node >=22, npm, Python >=3.10, Pillow.
- Install deps with npm. Generate assets. Run verification commands.
- Never ignore an install or build error; document exact diagnostics.

## Phase 1: 60-second playable slice
- Asset contract and exact animation metadata, original character/enemy/pickups.
- Move diagonally without speed exploit; enemy pursues; projectile auto targets.
- Damage, HP, invulnerability; defeated drops gem; EXP/level transitions.
- Keyboard feel, sprite-sheet crops, boot scene and 960x540 preview.
- Browser screenshot, frame comparison, test checklist, no console warnings.

## Phase 2: Full roguelite core
- Introduce WaveDirector (timed spawn schedules), enemy definitions (data-driven).
- Add ExperienceSystem & UpgradeChoiceScene; ensure pause during level-up.
- Add typed Weapon definitions and two more weapons, upgrades, cooldowns.
- Add boss and win/lose conditions at 10 minutes (do not fake using timer alone).
- Add proper pause and resume scene, high score/save preferences.

## Phase 3: Art and polish
- Expand deterministic AI art pipeline with visual-review tools and transparency checks.
- Add sprites for 3 enemy variants, boss, particles, hit feedback, UI icons.
- Generate original audio using code or license-verified alternatives.
- Accessibility: reduced flashes, volume sliders, keyboard navigation.

## Phase 4: QA and deployment
- Unit tests for formulas, spawn caps, cooldowns, upgrades, game state.
- Browser input tests: movement, attack, hit, collect, level, restart, pause/resume. `npm run test:e2e` provides a boot/keyboard/console smoke test; expand with scenario instrumentation to cover the rest.
- Stress benchmark with 100+ enemies, 60fps target on chosen reference desktop.
- Build production and deploy preview, smoke test asset paths, only then deploy live.

## Mandatory reporting after each batch
- Changed files and reason.
- Tests run with pass/fail evidence.
- Screenshot/replay reference for visual checks.
- Remaining limitations and next smallest task.
- Update PROGRESS.md, focused Git commit if appropriate.
