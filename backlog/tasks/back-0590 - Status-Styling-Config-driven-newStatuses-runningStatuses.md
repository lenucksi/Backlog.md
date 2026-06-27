---
id: BACK-0590
title: "Status-Styling: Config-driven newStatuses + runningStatuses"
status: Done
assignee: []
created_date: 2026-06-27 22:03
updated_date: 2026-06-27 22:26
completed_date: 2026-06-27 22:26
labels:
  - i18n
  - status
  - priority
dependencies: []
modified_files:
  - src/types/index.ts
  - src/utils/config-schema.ts
  - src/file-system/operations.ts
  - src/ui/status-icon.ts
  - src/ui/task-viewer-with-search.ts
  - src/ui/board.ts
  - src/ui/overview-tui.ts
  - src/core/init.ts
  - src/commands/advanced-config-wizard.ts
  - src/commands/overview.ts
  - src/web/components/TaskList.tsx
  - src/web/components/Statistics.tsx
  - src/web/App.tsx
  - src/test/status-icon.test.ts
  - src/test/config-commands.test.ts
ordinal: 350000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Status-Farben (○ white, ◒ yellow, ✔ green, ● red) sind bisher hardcodiert an englische Statusnamen gebunden. Deutsche Statusnamen bekommen daher keine Farbe.

Lösung: Zwei neue config-gesteuerte Status-Kategorien nach dem Pattern von `terminalStatuses` und `blockedStatuses`:

- `newStatuses` → ○ white (bisher hardcoded "To Do")
- `runningStatuses` → ◒ yellow (bisher hardcoded "In Progress")

Changes:
1. `BacklogConfig` Typ: `newStatuses?: string[]`, `runningStatuses?: string[]`
2. Config Schema: `new_statuses`, `running_statuses` Einträge
3. File Operations: YAML Snake↔Camel Mapping
4. `src/ui/status-icon.ts`: Rewrite zu config-driven Lookup statt hardcodierter statusMap
5. TUI Callers: Config durchreichen (task-viewer, board, overview)
6. Web UI: TaskList.tsx + Statistics.tsx + App.tsx Props
7. Init: advancedConfig Handling
8. Advanced Config Wizard: Prompts für neue Kategorien
9. Tests updaten
10. Defaults in config.yml
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BacklogConfig type has newStatuses and runningStatuses
- [ ] #2 Config schema has new_statuses and running_statuses entries
- [ ] #3 YAML snake↔camel mapping for both fields
- [ ] #4 status-icon.ts uses config-driven lookup (blocked→red, terminal→green, running→yellow, new→white)
- [ ] #5 Fallback heuristics when config lists not set (first=new, last=terminal, middle=running)
- [ ] #6 TUI callers pass config to status icon functions (task-viewer, board, overview)
- [ ] #7 Web UI TaskList and Statistics use config-driven getStatusColor
- [ ] #8 Init handles newStatuses/runningStatuses in advancedConfig
- [ ] #9 Advanced Config Wizard prompts for new/running statuses
- [ ] #10 Tests pass (status-icon, config-commands)
- [ ] #11 bun run tsc --noEmit passes
- [ ] #12 bun run check . passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented config-driven newStatuses and runningStatuses following the terminalStatuses/blockedStatuses pattern.

Changes across 15 files:

Types + Config:
- src/types/index.ts: Added newStatuses? and runningStatuses? to BacklogConfig
- src/utils/config-schema.ts: Schema entries with defaults
- src/file-system/operations.ts: YAML snake↔camel mapping + parse/save normalization

Core logic:
- src/ui/status-icon.ts: Rewrote getStatusStyle() to use config-driven lookup instead of hardcoded English statusMap. Priority: blocked → terminal → running → new → fallback heuristics. Added statusOptionsFromConfig() convenience helper.

TUI callers:
- src/ui/task-viewer-with-search.ts: Passes statusStyleOptions to formatStatusWithIcon() and getStatusColor()
- src/ui/board.ts: Passes to formatColumnLabel() and createTaskPopup()
- src/ui/overview-tui.ts + src/commands/overview.ts: Passes to getStatusIcon()

Init + Config Wizard:
- src/core/init.ts: Handles newStatuses/runningStatuses in advancedConfig
- src/commands/advanced-config-wizard.ts: Prompts for both with smart defaults

Web UI:
- src/web/components/TaskList.tsx: Config-driven getStatusColor with fallbacks
- src/web/components/Statistics.tsx: Same pattern
- src/web/App.tsx: Passes all status configs to both components

Tests:
- src/test/status-icon.test.ts: Full rewrite for config-driven logic + German statuses
- src/test/config-commands.test.ts: Updated prompt stubs for new wizard prompts
<!-- SECTION:FINAL_SUMMARY:END -->