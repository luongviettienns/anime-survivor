---
name: release-check
description: Validates version, reproducible asset generation, production build, performance and static deployment readiness.
---

# Release checklist
Read GDD/PROGRESS. Check `npm run verify`, generated asset hashes, package lock and Git status. Build static `dist/`, serve via Vite preview and test it in a browser. Verify all asset fetch URLs, no dev-only dependencies, no runtime API keys. Check licensing/provenance, basic input UI, performance with enemy caps, and fallback on missing assets. Create a release checklist and rollback plan; request explicit approval before any actual deployment. No false claims of production readiness.
