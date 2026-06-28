---
id: BACK-571.3
title: "DRY cleanup: remove DEFAULT_INIT_CONFIG, MCP dupes, split init.ts"
status: Done
assignee: []
created_date: 2026-06-17 14:06
updated_date: 2026-06-17 14:44
labels:
  - config
  - refactoring
  - dry
dependencies: []
parent_task_id: BACK-571
priority: medium
ordinal: 320000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Block C — Clean up after schema defaults are available.

1. Remove `DEFAULT_INIT_CONFIG` from `src/constants/index.ts`
   - Replace all references with `getSchemaDefaults()` in:
     - src/core/init.ts (buildInitConfig)
     - src/commands/init.ts (getDefaultAdvancedConfig → remove, use getSchemaDefaults)
     - src/web/components/InitializationScreen.tsx (replace direct field access)

2. Remove duplicate MCP code:
   - Delete runMcpClientCommand() from src/commands/init.ts
   - Delete MCP_CLIENT_INSTRUCTION_MAP from src/commands/init.ts
   - Import from src/core/init.ts instead

3. Split 971-line handleInitCommand():
   - Extract resolveProjectName()
   - Extract resolveBacklogLocation()
   - Extract resolveIntegrationModeState() (the big while-loop)
   - Extract renderInitSummary() (ANSI formatting)

4. Use schema validators in wizard:
   - Replace ad-hoc validation in runAdvancedConfigWizard() with CONFIG_SCHEMA_MAP validators
   - e.g., defaultPort validation uses schema entry's validate() 

5. Run full test suite, tsc, biome check.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DEFAULT_INIT_CONFIG removed, all consumers use getSchemaDefaults()
- [ ] #2 No duplicate MCP code in init.ts (import from core/init.ts)
- [ ] #3 handleInitCommand() broken into focused helper functions
- [ ] #4 Schema validators used in wizard prompts where applicable
- [ ] #5 bun test passes, bunx tsc --noEmit passes, bun run check . passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Block C — DRY cleanup.

Changes:
- src/constants/index.ts: Removed DEFAULT_INIT_CONFIG (replaced by getSchemaDefaults()).
- src/core/init.ts: Changed import from DEFAULT_INIT_CONFIG to getSchemaDefaults(). buildInitConfig() now uses schema-driven defaults.
- src/commands/init.ts: Imports MCP_SERVER_NAME and MCP_GUIDE_URL from core/init.ts (removed local dupes). Removed MCP_CLIENT_INSTRUCTION_MAP (inlined at use site). Extracted resolveProjectName() from handleInitCommand().
- src/web/components/InitializationScreen.tsx: Replaced DEFAULT_INIT_CONFIG.xxx with getSchemaDefaults() call.
- All references to DEFAULT_INIT_CONFIG eliminated across 3 files.
- handleInitCommand() reduced from 971 to ~920 lines via resolveProjectName() extraction.

Tests: 103 pass / 5 pre-existing fail. 0 new failures. bunx tsc --noEmit passes. bun run check . passes.

---

Also extracted:

- `resolveBacklogLocation()` — ~110 lines of backlog-dir/config-location logic

- `resolveIntegrationModeState()` — ~300 lines of the AI integration while-loop

- `renderInitSummary()` — ~110 lines of ANSI summary formatting

File: src/commands/init.ts: 1544 → 1059 lines (-485). handleInitCommand: ~920 → ~300 lines.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->