---
id: BACK-571.2
title: Add status configuration section to advanced config wizard
status: Done
assignee: []
created_date: 2026-06-17 14:06
updated_date: 2026-06-17 14:25
labels:
  - config
  - init
  - ux
dependencies: []
parent_task_id: BACK-571
priority: high
ordinal: 319000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Block B — UX change for status management in the wizard.

Add a new status configuration section as the first section in `runAdvancedConfigWizard()`:

1. Show current default statuses: "To Do, In Progress, Done"
2. Ask: "Add extra statuses?" — multiselect with options: Blocked, Deferred, Review, Cancelled, Custom...
   - Custom opens a free-text prompt for arbitrary status names
3. After statuses are finalized, prompt for terminalStatuses:
   - Pre-fill with statuses matching /done|cancelled|complete|closed/i
   - Fallback: ["Done"]
   - Accept comma-separated input
4. Prompt for blockedStatuses:
   - Pre-fill with statuses matching /blocked|block/i
   - Fallback: ["Blocked"]
   - Accept comma-separated input
5. Wire status results into `AdvancedConfigWizardResult.config` so they reach `buildInitConfig()`
6. Extend `InitializeProjectOptions.advancedConfig` to accept statuses, terminalStatuses, blockedStatuses
7. Update `buildInitConfig()` to use wizard-provided values

Test: config-commands.test.ts stub sequences need updating to cover the new prompts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Advanced config wizard includes status configuration as first section
- [ ] #2 Multiselect for extra statuses (Blocked, Deferred, Review, Cancelled, Custom) works
- [ ] #3 Terminal/blocked status prompts pre-fill intelligently from configured statuses
- [ ] #4 Empty input on terminal/blocked keeps the pre-filled defaults
- [ ] #5 Status results propagate through to saved config.yml
- [ ] #6 Prompt stub tests in config-commands.test.ts updated
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Block B — Status configuration section in advanced config wizard.

Changes:
- src/commands/advanced-config-wizard.ts: Added status config section as first section in runAdvancedConfigWizard(). Shows current statuses as clack.note(), multiselect for extra statuses (Blocked, Deferred, Review, Cancelled, Custom...), Custom opens a free-text prompt. Terminal statuses prompt pre-fills from statuses containing done/cancelled/complete/closed patterns. Blocked statuses prompt pre-fills from statuses containing "block". Empty input preserves pre-filled defaults. All three fields (statuses, terminalStatuses, blockedStatuses) included in AdvancedConfigWizardResult.config.
- src/core/init.ts: Extended InitializeProjectOptions.advancedConfig to accept statuses/terminalStatuses/blockedStatuses. Updated buildInitConfig() to use wizard-provided values with resolveOverrideValue pattern.
- src/commands/init.ts: Passes status fields from wizard through to initializeProject().
- src/test/config-commands.test.ts: Added 3 new stub entries per test sequence for the new status prompts.

Tests: All config-commands.test.ts tests pass. 0 new failures. bunx tsc --noEmit passes. bun run check . passes.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->