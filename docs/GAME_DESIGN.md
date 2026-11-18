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

## Normal monster signature attacks (2026-11-18)
- Armored masked warrior (`slime` internal ID): Blood Seal Groundbreak / Huyet An Chan Dia. 400ms braced double-claw windup, 72px radial impact for 16 damage, illustrated crimson seal/fissures/flame/smoke (480ms cosmetic afterglow), 140ms impact and 360ms recovery. Starts within68px, cooldown1800ms. Escape the circle or interrupt with knockback.
- Hooded Shade: Shadowstep Triple Claw / Anh Bo Tam Trao. 450ms crouched telegraph, commits to the initial target direction, dashes460px/s for220ms with purple afterimages and three illustrated ivory-purple plasma claw blades with smoke/shards and480ms cosmetic afterglow. One14-damage hit within38px of its path,330ms recovery,2200ms cooldown. Starts within130px. Dodge sideways; the dash never homes after windup.
- Both use direction-specific windup/strike poses: south, north/back, east; west mirrors east. Timed neutral/windup/strike/recovery frames stay at the same foot anchor and separate from physics bodies. Contact damage is suppressed during the attack cycle.
- Successful skills and hostile bolts use shared player i-frames. Accepted hits create a player-centered impact VFX and140ms directional knockback (slam240px/s, dash/bolt180px/s). Blocked hits produce no extra VFX/knockback. Existing reduced shake/flash settings apply. Attacks cancel on monster knockback/death; pause freezes simulation.

## Arcane upgrade UI and combat readability
Upgrade selection uses gold/silver cosmic-indigo card art, crystal sockets and a centered ability banner; keyboard1/2/3 and pointer selection remain functional. HUD anchors use logical canvas edges/center, crystal markers follow HP/XP fill, two crown emblems flank the centered bottom boss bar. Bitmap damage numbers remain small:12px normal,14px high/explosive damage,16px critical with8px crit icon. Explosion numbers use orange tint and a compact low-alpha burst; no CRIT/SMASH/BOOM word labels in combat. Numbers grow from72% to100% of the small size cap during the first30% of lifetime, stay readable, then fade during the final40%. Rise is anchored to the hit world point(x,y-14) and elapsed time; lifetime380/450/420ms for normal/crit/explosion. Crit icon and explosion mark stay attached.
