# Consolidate actor review into the main project

Behavior: retain validated actor animations, aura fit and isolated HUD camera; widen world view from1.5 to1.3 and reduce world artwork by12.5% (standing bodies112px,boss224px), without changing native PNGs or physics. Kirito starts only with dual_slash level1. Phantom Dash starts locked and is granted only by selecting its Kirito-only level-up card; other existing weapon cards retain their unlock flow. Restart resets unlocks.

Files: validated review src changes, actorClips/phantomDash config and native assets; domain/upgrades, Dash/HUD/debug adapters, tests and documentation.

Acceptance: source-copy comparison avoids overwriting divergent main files; new upgrade pure tests fail before implementation; source/public/build PNGs remain identical; npm run verify; browser actual levelup card selection, Space locked/unlocked, restart, Naruto regression, actor/caster/reaction rendering and HUD layout. No deployment or missing-art completion claim. Existing review folder is an archived snapshot, main is canonical.

Completed. Actual verification and remaining art/performance limitations: art/review/merged-main-20261118/report.json. Archived source snapshots are intentionally retained and must not be used as independent development versions.
