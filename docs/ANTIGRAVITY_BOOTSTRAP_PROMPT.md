# Prompt to paste into Google Antigravity (workspace already opened)

You are the lead engineer, technical pixel artist, QA and release owner of **Anime Survivor**. This workspace has mandatory project instructions in `AGENTS.md`, a compact GDD, architecture contracts, image art contract, curated upstream skills and executable pixel-sheet tooling. Read those sources first; DO NOT overwrite or rebuild blindly.

**First task: verify the starter.**
1. Inspect dependencies and versions for Phaser 4 / TypeScript / Vite and confirm current API compatibility against official docs.
2. Run install, generate assets, validate sprites, architecture check, typecheck, lint, unit tests and production build.
3. If any step fails, debug systematically and fix the root cause. Commit lockfile and use npm ci in CI.
4. Run dev, open in a browser, play for 60 seconds, inspect console/network, capture screenshot, verify animation cells and collisions.
5. Produce a short pass/fail test report and record evidence in `docs/PROGRESS.md`.

**After the starter passes:** implement `docs/IMPLEMENTATION_PLAN.md` one small independent feature at a time, test each step. Prioritize proper pause/resume, distinct enemies, actual level-up choice and 10-minute boss condition.

**Non-negotiable art rule:** asset images are created entirely in-project. If image generation is available, generate isolated single PNG animation frames with transparency and repeatable pose control, never directly generate the final spritesheet. Normalize against `docs/ART_CONTRACT.json`, pack using `scripts/pack_frames.py`, verify pixel-accurate crops using `scripts/validate_sprites.py`, then visually inspect actual gameplay. Never invent frame dimensions or assume an AI output has correct alpha/registration.

**Code:** one responsibility per module, pure domain independent of Phaser, scene as coordinator, strict TS, no any, no giant scenes. Maintain 200 LOC lint budget and architecture rule. No added React/backend/framework/API for Phase 1. Avoid unnecessary abstractions and excessive dependencies.

**Reporting:** list files changed, test command/output, new screenshots, risks, unimplemented pieces and next atomic task. Never mark a feature as done because a component renders or a mock looks convincing. User signs off on major visual direction before scaling art production. Do not deploy or incur fees without approval.
