# Temporary gameplay attachment

Active only in isolated5184 project. Main game source/public files remain unchanged.

54 non-Dash actor clips now load121 unique original PNG textures once, retaining RGBA/native dimensions. Existing4Dash clips remain attached. Kirito uses available directional idle/run, owned slash/basic, dual-wave levels, accepted hit and death. Right run uses authored right idle until a run pose exists; missing side skill/reaction clips retain legacy unmirrored front fallback. Death delays the GameOver transition only while an available death clip plays.

Enemy normal/shade/mage reactions support4directions; elite front hit/death and boss front hit act as explicit temporary fallbacks for missing reaction headings. Boss death remains legacy. Enemy cast overlays use windup/release poses at actual AI phase changes. Combat physics/AI, rewards and domain formulas stay intact. Detached death sprites are capped with a64sprite reusable pool, fade and clean up; they never retain pooled enemy physics references.

Known limitation: source spell-pose hands and silver outfit details can differ between independently generated images. Existing gameplay hand-charge positions still come from legacy per-frame hand metadata. The screenshot should be reviewed before final art approval. Basic slash attaches to an owned slash weapon; no new separate melee mechanic/key was added.

Integration files: ../integration.patch (combined source diff), src/game/config/actorClips.json (authoritative timings/origins), source copies here. Applying the patch elsewhere requires copying referenced original images into public/assets/actor-v2 and adding actorClips.json at its source path. Review against the target source snapshot first.

Checks: npm run verify passes17files/72tests plus TS/lint/architecture, legacy art validation and production build. Source-to-public-to-dist hashes matched121unique PNGs. Browser tests cover keyboard locomotion, actual dual skill levels front/back, owned basic slash, accepted hero hit/death,14enemy reaction cases,8actual mage/boss cast direction cases with projectile release, unchanged scale during casts,64corpse cap/cleanup and restart into Naruto. Console/network/page errors were absent in recorded checks. Long combat/performance and user acceptance are not claimed.
