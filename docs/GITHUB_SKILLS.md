# GitHub references & reviewed integrations

Only **curated** sources; no blanket import of large skill bundles.

| Upstream | Relevant pieces | Intended use |
|---|---|---|
| https://github.com/phaserjs/template-vite-ts | TypeScript + Vite baseline | Compare configs and Phaser practices; current project is independent, not a clone |
| https://github.com/obra/superpowers | writing-plans, test-driven-development, systematic-debugging, verification-before-completion | Development process; manually inspect SKILL.md / licenses before copying |
| https://github.com/anthropics/skills | webapp-testing | Browser test planning; note repository skill may include specific runtime helpers |
| https://github.com/vercel-labs/agent-skills | web-design-guidelines | Optional audit of game menus/settings UI, not gameplay renderer |
| https://github.com/google-gemini/gemini-cli | skill-creator | Skill-writing reference only; use existing local customized skills |
| https://github.com/libresprite/libresprite | Open-source sprite editor | Optional pixel debugging / retouch, not required to generate assets |

## Installation guidance
Antigravity autodiscovers `.agents/skills/<name>/SKILL.md` in the workspace. Six project-specific skills are already provided. Try these **before** adding more.

For one vetted external skill, inspect upstream content first, then use the `skills` CLI (https://github.com/vercel-labs/skills):
```
npx skills add obra/superpowers --list
npx skills add obra/superpowers --skill systematic-debugging
npx skills add obra/superpowers --skill verification-before-completion
```
The CLI installation directory can vary by agent version: confirm installed skill folders appear in `.agents/skills/` as documented for Antigravity. Move/copy only vetted skill directories when necessary. Avoid `--all`, avoid global installs for this project, and do not allow arbitrary code execution by a downloaded SKILL.md.

You can instead read upstream `SKILL.md` directly and implement its applicable practices without installing it. License and tool/runtime compatibility must be reviewed before redistribution.

**Why not dozens of skills?** Every extra skill can introduce conflicting conventions and token overhead; gameplay + art precision need focused guardrails.
