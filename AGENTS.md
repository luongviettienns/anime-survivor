# Anime Survivor — mandatory Antigravity instructions

Read `README.md`, `docs/GAME_DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ART_PIPELINE.md`, and `docs/IMPLEMENTATION_PLAN.md` before significant changes. This is a solo-developer, AI-assisted project. The user does not draw art. You own implementation, asset generation, testing, and documentation, but **must not pretend a test or user review passed**.

## Definition of the product
2D pixel-art anime survival roguelite for browser. Single player and offline first. Phaser 4 + Vite + strict TypeScript. NO React, Next.js, backend, online accounts, multiplayer, AI API at runtime, or premature ECS framework.

## Source rules
1. A scene orchestrates systems. Do not put all combat, enemy AI, UI, item drops, and persistence in GameScene.
2. Pure gameplay formulas live in `src/domain/` and must never import Phaser or browser APIs.
3. Infrastructure/game adapters live in `src/game/`; UI lives in `src/ui/`. Keep coupling inward and dependencies explicit.
4. Prefer composition and functions; no unnecessary base classes/singletons/event buses. Introduce abstractions only for demonstrated duplication or tests.
5. Normal target ≤160 LOC/file. ESLint enforces 200 effective lines; architecture script enforces 210 physical lines. Split by responsibility, not arbitrary line count.
6. No `any`, `@ts-ignore`, unused modules, commented-out code, or catch-and-ignore failures. Use data/config for repeated enemies and weapons.
7. Avoid dependencies without a written reason. Never download and execute unreviewed scripts; do not blindly install skills from third-party repos.
8. Keep frame rates/performance in mind: no per-frame DOM operations, expensive allocations, or O(N²) enemy search at scale. Profile before optimization.

## Art is source-controlled and deterministic
- All baseline assets are original generated code in `scripts/generate_assets.py`.
- For AI-generated assets: generate **one frame per file**, not a complete spritesheet image; consult `docs/ART_PIPELINE.md` and `docs/ART_CONTRACT.json`.
- RGBA, exact canvas dimensions, common anchor, no clipping, nearest-neighbor only, same palette.
- Use `python scripts/pack_frames.py` then `python scripts/validate_sprites.py` before an animation is used in Phaser.
- Generated spritesheets + metadata MUST be pixel-identical to individual frames. Never estimate sheet frameWidth, offsets or count.
- All third-party artwork needs explicit provenance and license before use; do not copy recognizable commercial anime characters.

## Agent skills — use on demand
`.agents/skills/anime-pixel-art`, `sprite-pipeline`, `phaser-gameplay`, `architecture-guard`, `game-qa`, `release-check`.
Read the relevant skill before a related task. External curated skill links: `docs/GITHUB_SKILLS.md`.

## Workflow gate for each feature
1. Document behavior, files to change and a small acceptance checklist.
2. Write failing test for pure logic, implement minimum, refactor.
3. Generate/validate assets first if artwork changes.
4. Run `npm run verify`; if it cannot run, record exactly why without claiming success.
5. Open game in browser, inspect logs, make representative screenshot, test keyboard and actual gameplay.
6. Update `docs/PROGRESS.md`, commit a focused change. Do not deploy without approval.

## Scope guard
Finish a playable 60-second vertical slice with reliable movement/auto-attack/XP before building the full 10-minute run. Menu, pause, upgrades and boss are roadmap items until implemented and verified; never mark them finished based on mocks.
