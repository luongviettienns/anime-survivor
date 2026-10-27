---
name: architecture-guard
description: Audits TypeScript module responsibilities, boundary coupling, oversized game scenes and unnecessary dependencies.
---

# Architecture auditor
Read `docs/ARCHITECTURE.md`. Run `npm run check:arch`, `npm run typecheck`, `npm run lint`. No domain dependency on Phaser. Keep files compact (<160 target, ESLint <=200 effective lines); split when responsibility grows, not by arbitrary line count. Keep scenes as orchestration, avoid circular imports, global mutable singletons, complicated event buses and overengineering. Report specific files and one concrete refactor per violation. Prefer direct calls to invented layers.
