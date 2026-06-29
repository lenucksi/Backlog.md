---
id: BACK-0611
title: CLI-Instructions command for LLM progressive discovery
status: Done
assignee: []
created_date: 2026-06-29 14:12
labels:
  - cli
  - docs
dependencies: []
modified_files:
  - src/guidelines/render.ts
  - src/guidelines/cli/overview.md
  - src/guidelines/cli/index.ts
  - src/commands/instructions.ts
  - src/cli.ts
  - src/ui/splash.ts
  - README.md
  - ADVANCED-CONFIG.md
  - DEVELOPMENT.md
  - CONTRIBUTING.md
  - TEST-SCENARIOS-Auto-Linking-Backlinks.md
ordinal: 401000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Added `backlog instructions` CLI command and discovery hints so LLM agents using backlog via CLI can find workflow guidance (previously only exposed via MCP resources).

Implementation:
- `src/guidelines/render.ts` — renderForCli() with tool-name mapping (MCP→CLI)
- `src/guidelines/cli/overview.md` — CLI-specific overview guide
- `src/guidelines/cli/index.ts` — CLI guide exports
- `src/commands/instructions.ts` — `backlog instructions [guide]` command
- `src/cli.ts` — import + registerInstructionsCommand + addHelpText
- `src/ui/splash.ts` — `--plain` → `--json` + LLM agent hint in splash
- Doc fixes: README.md (wrong MCP URI), ADVANCED-CONFIG.md (broken script ref), DEVELOPMENT.md (wrong commands, empty section), CONTRIBUTING.md (bun run check), TEST-SCENARIOS (bun run cli browse)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built `backlog instructions` CLI command that exposes workflow guides (overview, task-creation, task-execution, task-finalization) for LLM agents using backlog via CLI, with tool-name mapping from MCP to CLI equivalents. Added discovery hints in `--help` and splash screen. Fixed 6 doc files with broken/outdated references.
<!-- SECTION:FINAL_SUMMARY:END -->