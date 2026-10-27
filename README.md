# Anime Survivor — Antigravity workspace / playable prototype

A **starter workspace, NOT a fully finished game**. Designed so Google Antigravity can build a high-quality anime pixel-art web survivor game from A–Z without hand-drawn assets. Original code-generated hero, enemy, tile, tree, pickups, project specification and custom skills included.

## Windows setup (recommended)
Install Node.js 22+, Git, Python 3.10+ and `pip`. Open this directory in Antigravity terminal (PowerShell):

```powershell
python -m pip install Pillow
npm install
npm run assets:generate
npm run assets:validate
npm run verify
npx playwright install chromium
npm run test:e2e
npm run dev
```

If Windows exposes Python only as `py`, use `py -3 -m pip install Pillow` and `py -3 scripts/generate_assets.py`; adjust npm scripts or add `python` to PATH. The local game URL is printed by Vite. `npm install` will create `package-lock.json`; commit the lockfile, then switch CI to `npm ci` if desired.

**Known verification limit:** npm install timed out in the artifact-generation environment, so TS/build/browser correctness is unverified here. The Python sprite validation and architecture script were executed and passed. Ask Antigravity to fix any environment or TypeScript errors before implementing other features.

## Fast start with Antigravity
1. Extract ZIP into a project folder and open it as an Antigravity workspace.
2. Read `AGENTS.md`; the six local `.agents/skills/*/SKILL.md` files are auto-discoverable.
3. Paste `docs/ANTIGRAVITY_BOOTSTRAP_PROMPT.md` into the agent.
4. Let the agent install deps, run checks, open Chrome, inspect gameplay and screenshot, then implement roadmap in small milestones.
5. Never accept “done” until tests/build/browser/playable behavior have concrete evidence.

## Source map
`src/domain/`: engine-free formulas. `src/game/scenes/`: thin lifecycle coordinators. `src/game/systems/`: isolated logic adapters. `scripts/`: deterministically generates and packs original sprites, validates pixel-identical crops. `docs/`: contracts and implementation plan. `.agents/skills/`: game-specific instructions.

## Current prototype interactions
WASD / arrow keys to move. Projectile automatically targets closest nearby enemy. Enemies chase. Kill → EXP pickup → levels heal HP. Simple victory when timer reaches 10 minutes, or defeat if HP reaches zero. Victory timer is a temporary prototype placeholder, *not* the planned boss completion behavior.

## Useful commands
`npm run assets:generate`, `npm run assets:validate`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:arch`, `npm run build`, `npm run verify`, `npm run test:e2e` (requires Chromium).

## License and art ownership
All generated assets in this starter are original procedural geometry. Upstream projects are referenced by URL, not copied. Verify code/assets/licenses before adding third-party content. “Anime-inspired” does not mean copying an existing franchise.
