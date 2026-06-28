---
id: BACK-571.1
title: Schema-driven defaults utility + config-migration rewrite
status: Done
assignee: []
created_date: 2026-06-17 14:06
updated_date: 2026-06-18 15:06
labels:
  - config
  - refactoring
dependencies: []
parent_task_id: BACK-571
priority: high
ordinal: 318000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Block A — Foundation for all other changes.

1. Add `getSchemaDefaults()` to `src/utils/config-schema.ts` that aggregates all `default` values from CONFIG_SCHEMA_ENTRIES into a Partial<BacklogConfig>

2. Update schema defaults:
   - terminal_statuses: [] → ["Done"]
   - blocked_statuses: [] → ["Blocked"]  
   - max_column_width: add default of 20

3. Rewrite `src/core/config-migration.ts`:
   - Replace hardcoded defaultConfig with schema-driven approach using getSchemaDefaults()
   - Handle migration: if maxColumnWidth === 80 (old default), bump to 20
   - If terminalStatuses/blockedStatuses are absent, fill from schema defaults
   - If they exist as [] (empty), keep [] — do NOT overwrite user choice
   - On load, if user has [] but new defaults differ, ask to upgrade (display a one-time prompt or log)
   - Keep needsMigration() minimal — just check if core required fields exist

4. Tests:
   - Update config-hang-repro.test.ts assertions if needed
   - Ensure enhanced-init.test.ts passes with new defaults
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getSchemaDefaults() returns all non-readOnly schema entry defaults as a BacklogConfig-compatible object
- [ ] #2 config-migration.ts uses schema defaults instead of hardcoded subset
- [ ] #3 Existing [] terminalStatuses/blockedStatuses preserved (not overwritten)
- [ ] #4 maxColumnWidth 80→20 migration handled
- [ ] #5 All existing migration tests pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Block A — Schema-driven defaults + migrator rewrite.

Changes:
- src/utils/config-schema.ts: Added getSchemaDefaults() that aggregates all non-readOnly schema entry defaults into a Partial<BacklogConfig>. Updated terminal_statuses default from [] to ["Done"], blocked_statuses from [] to ["Blocked"], added max_column_width default of 20.
- src/core/config-migration.ts: Rewrote to be schema-driven. Uses getSchemaDefaults() instead of hardcoded defaultConfig. Handles maxColumnWidth 80→20 migration. Preserves existing [] values (schema defaults only apply when field is absent). needsMigration() now checks only projectName and statuses (core required fields).

Tests: All 5 pre-existing failures unchanged. 0 new failures. bunx tsc --noEmit passes. bun run check . passes (4 warnings, 0 errors).

Post-completion follow-up: Resolved 5 remaining test regressions classed as "pre-existing" — actually caused by migration defaults not being injected (auto-commit, server-init, offline-integration, config-hang, status-callback). Source fixes: configToRaw onStatusChange key mapping (round-trip), delete merged.milestones on write, filesystemOnly ?? in init.ts. All 36 regressions from BACK-570 + BACK-571 now fixed, full suite 168/168 passes.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->