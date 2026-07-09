---
id: BACK-0603
title: Refactor src/commands/task.ts — Handler-Splits (1.491→200)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-07-05 19:58
labels:
  - refactoring
  - tech-debt
  - large-file
milestone: m-15
dependencies: []
priority: medium
ordinal: 386000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
task.ts ist der CLI-Task-Command mit 1.491 Zeilen. Enthält 7 Handler-Funktionen in einer Datei: create, list, edit, reorder, view-section + die Commander-Registrierung.

Ziel: Jeder Handler in eigene Datei + command-registration separat. task.ts wird zur Imports-only Datei (~200 Zeilen).

Subtasks:
- 0603.01 task-create-handler.ts — handleTaskCreateCommand
- 0603.02 task-list-handler.ts — handleTaskListCommand
- 0603.03 task-edit-handler.ts — handleTaskEditCommand (größter Handler)
- 0603.04 task-view-section.ts — viewTaskSection
- 0603.05 task-reorder-handler.ts — handleTaskReorderCommand
- 0603.06 task-command-registration.ts — Commander-Setup + Optionen
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 6 Subtasks (0603.01-.06) erledigt
- [ ] #2 task.ts ≤ 250 Zeilen
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Extraktions-Reihenfolge (jeder Handler bereits als eigenständige Funktion existent):
1. src/commands/task-create-handler.ts — handleTaskCreateCommand
2. src/commands/task-list-handler.ts — handleTaskListCommand
3. src/commands/task-edit-handler.ts — handleTaskEditCommand (größter handler)
4. src/commands/task-view-section.ts — viewTaskSection
5. src/commands/task-reorder-handler.ts — handleTaskReorderCommand
6. src/commands/task-command-registration.ts — registerTaskCommand mit Commander setup
7. task.ts wird nur noch imports + re-exports
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Diese Extraktion ist mechanisch — jeder Handler ist bereits eine abgeschlossene Funktion mit klaren imports. Der schwierigste Teil ist die Commander-Registrierung mit all ihren .option() und .action() chains (~340 Zeilen).

Die Handler teilen sich Helper (hasCreateFieldFlags, hasEditFieldFlags, resolveCliMilestoneInput) — diese bleiben in task.ts oder kommen in ein eigenes helpers-file.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->