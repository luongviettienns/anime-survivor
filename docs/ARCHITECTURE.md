# Architecture contract

```
src/main.ts                    Composition root, Phaser.Game
src/game/scenes/               Thin lifecycle coordinators (Boot, Game, GameOver)
src/game/systems/              Scene-bound systems (movement, enemies, weapons, later XP, waves)
src/game/entities/             Phaser-specific object wrappers only when useful
src/game/config/               Tuning knobs and visual definitions
src/domain/                    Pure math/rules/state transitions; no Phaser/browser
src/ui/                        Screens and HUD; interfaces only (expand in milestone 2)
scripts/                       Reproducible art tooling and architecture checks
art/frames/                    Authoritative original animation frames
public/assets/                Generated sheets, textures, manifests
docs/                          Specs, progress, audit trail
```

## Dependency directions
- `domain` → no game/engine imports.
- `game/systems` → `domain` + engine + config permitted.
- `game/scenes` → systems and UI; orchestrate lifecycles.
- `ui` → state DTOs and Phaser visuals; should not decide damage/spawning.
- No scene-to-scene business logic; carry only typed result data.

## Evolution
- As enemy counts grow, replace O(N) scans with cached nearest targets or fixed-rate spatial queries; consider pools when profiling shows allocation pressure.
- Use a central `RunState` only when multiple systems truly need shared data. Prefer typed plain objects.
- Server architecture only when online features are approved.

## Code review checklist
[ ] module has a clear one-sentence responsibility
[ ] scene delegates algorithms
[ ] explicit TS types, no `any`
[ ] no placeholder UI pretending to be implemented
[ ] no unexpected dependency
[ ] tests for formulas / edge cases
[ ] sprite pipeline validated if asset changed
[ ] typecheck/lint/test/build/browser checks recorded
