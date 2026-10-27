---
name: phaser-gameplay
description: Implements Phaser survival roguelite systems, enemies, projectiles, XP, levelups and controls without monolithic scenes.
---

# Gameplay engineering
Read GDD, architecture and plan. Keep Phaser lifecycle in scenes, logic in isolated systems, pure formulas in `src/domain`. Add weapons/enemies via typed data definitions and simple composable functions. Use normalized delta / fixed timers. Ensure automatic attacks acquire a valid target, projectiles have TTL, collisions are debounced, pickups are not collected twice, enemies have population cap. Implement small vertical slices and game controls before adding content. Keep code easy to test and tune; use profiling before premature ECS/pooling abstractions.
