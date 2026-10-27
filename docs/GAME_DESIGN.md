# Anime Survivor — concise Game Design Document

## Product pitch
Original anime-fantasy heroine survives waves of shadow creatures in a lush enchanted pixel forest. Top-down orthographic, crisp 2D 32px characters at 2x display scale. Fast controls, automatic attacks, XP gems, meaningful choices on level-up. No recognizable copyrighted anime franchises.

## Core loop
Move / dodge → auto-target enemies → collect experience → choose one of 3 upgrades → survive stronger waves → defeat boss → victory / defeat screen.

## v1.0 acceptance scope
- 1 original player with idle + walk facing, run speed normalized diagonally.
- 3 visibly distinct enemy types (slime, shade, ranged mage) with spawn escalation and capped population.
- Basic projectile, short-range slash, and orbiting charm weapons with upgrade levels.
- HP, invulnerability frames, knockback, pickups, HP restoration, level-up UI with 3 choices.
- 1 procedural forest, 10-minute countdown, one boss at end, win/lose/restart and pause.
- Pixel-perfect original spritesheets and transparent frame manifests.
- Keyboard movement (WASD / arrows), basic desktop accessibility settings.
- Audio generated/owned assets or opt-out audio, save high score/settings locally.
- Test suite, desktop browser performance measurements, deployable static build.

## Current starter status
A *prototype*, NOT completed v1.0. Already coded: original programmatic pixel art, map, movement, auto-target projectiles, one enemy type, damage, XP, heal-on-level-up, timer and simple victory/defeat screen. Not yet done: pause, choose-upgrade UI, 3 enemy types, boss, audio, save, finished balance, mobile UX, Playwright E2E validation. Avoid falsely claiming completeness.

## Visual direction
No pasted-in third-party art. Anime-inspired rather than branded: violet-haired swordswoman, turquoise magic, deep teal forest, soft lilac particle accents. Target clean silhouettes and stable foot origin; readability before detail. Design original title/menu art after gameplay slice passes QA.

## Non-goals until v1.0
Multiplayer, accounts, backend, gacha, cash shop, online leaderboards, large open world, advanced ECS, mobile-first controls, dozens of heroes, voiced scenes, commercial anime character IP.
