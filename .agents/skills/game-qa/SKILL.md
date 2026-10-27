---
name: game-qa
description: Tests Anime Survivor controls, survival gameplay, asset crops, browser rendering, console errors and regressions.
---

# Game testing
Read GDD and milestone acceptance. Run asset validators and `npm run verify`. Run browser QA with WASD/arrows, auto attack, projectile lifetime, collision damage, pickup once, movement bound, restart. Inspect browser console/network, desktop aspect ratios, reduced-motion preference as later feature. Capture screenshots and visually inspect idle/walk rows and clipped/smeared pixels. If browser tooling unavailable, say NOT VERIFIED. For game loop and pure formulas, write Vitest tests and run them. Maintain evidence in `docs/PROGRESS.md`.
