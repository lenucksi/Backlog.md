---
id: BACK-571
title: Modernize init wizard and config system
status: Done
assignee: []
created_date: 2026-06-17 14:05
updated_date: 2026-06-18 15:05
labels:
  - config
  - init
  - refactoring
dependencies: []
priority: high
ordinal: 317000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the BACK-563 config system overhaul, the init wizard and config defaults are scattered across multiple files with duplicated values, missing terminalStatuses/blockedStatuses prompts, and an outdated config-migration.ts. This task consolidates defaults into a single source of truth (config-schema.ts), rewrites config-migration.ts to be schema-driven, adds status configuration (terminal/blocked statuses) to the advanced config wizard, DRYs up duplicate MCP code, removes DEFAULT_INIT_CONFIG, and splits the bloated init.ts command handler.

See conversation analysis for full breakdown of all duplications and inconsistencies.
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
Modernized init wizard and config system:

**Block A** — Schema-driven defaults: Added `getSchemaDefaults()` to `config-schema.ts`. Rewrote `config-migration.ts` to be schema-driven. Updated terminal_statuses default to `["Done"]`, blocked_statuses to `["Blocked"]`, max_column_width to 20.

**Block B** — Status wizard: Added status configuration section to `runAdvancedConfigWizard()` with multiselect extras, free-text custom, smart pre-fill for terminal/blocked statuses. Wired through `init.ts` → `buildInitConfig()`.

**Block C** — DRY cleanup: Removed `DEFAULT_INIT_CONFIG` from constants. Removed duplicate MCP code from init.ts. Extracted 4 helpers from handleInitCommand: resolveProjectName, resolveBacklogLocation, resolveIntegrationModeState, renderInitSummary. File: 1544 → 1059 lines (-485). handleInitCommand: ~920 → ~300 lines.

Tests: 103 pass / 5 pre-existing fail. 0 new failures. tsc + biome clean.

Post-completion fix: 36 test regressions from BACK-570 + BACK-571 resolved entirely. Source fixes: (1) configToRaw onStatusChange→on_status_change key mapping (round-trip bug), (2) delete merged.milestones in saveConfig to strip legacy key, (3) filesystemOnly ?? in init.ts. Test fixes across 11 files covering config format, MCP tools, board filters, status callbacks, and config migration. Full suite 168/168 passes, biome check clean.
<!-- SECTION:FINAL_SUMMARY:END -->