---
id: BACK-529.2
title: BACK-529.2 — completeTask() CLI + WebUI vereinheitlichen
status: Done
assignee: []
created_date: '2026-05-22 18:42'
updated_date: '2026-05-24 13:20'
labels:
  - cleanup
  - cli
  - web-ui
  - consistency
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: high
ordinal: 247000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
CLI `task complete` setzt nur Status (leaves file in `tasks/`), WebUI "Mark as completed" verschiebt roh (ohne Status-Update). Beide müssen das Gleiche tun.

## What
- CLI `task complete` ruft `core.completeTask()` auf (wie WebUI) statt nur `editTask(status:"Done")`
- `completeTask()` setzt IMMER `status: terminalStatus` + `status: "Archived"` (über .6)
- Einheitlicher Flow: Status setzen + Datei nach `archive/tasks/` verschieben

## Implementation plan
1. `commands/task.ts`: `handleTaskCompleteCommand` → `core.completeTask(task.id)` statt `editTask({status:"Done"})`
2. Eventuell `core.completeTask()` um Status-Set erweitern (wenn .6 noch nicht implementiert)
3. `bunx tsc --noEmit`
4. `bun run check .`
5. `bun test`

## Files
- `src/commands/task.ts`
- `src/core/backlog.ts`
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CLI task complete ruft core.completeTask() statt editTask(status:Done)
- [x] #2 Einheitlicher Flow: Status setzen + archive/tasks/ verschieben für CLI und WebUI
- [x] #3 Keine tsc Fehler
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
handleTaskCompleteCommand in commands/task.ts: core.editTask(task.id, {status:"Done"}) → core.completeTask(task.id). Console-Message von "marked as Done" zu "archived" geändert. core.completeTask existiert bereits in backlog.ts und ruft fs.completeTask() auf, das durch BACK-529.6 jetzt Archived setzt.

Serena-Tool: serena_replace_content(literal) in commands/task.ts Zeile 837-861
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CLI `task complete` ruft jetzt `core.completeTask(task.id)` auf statt `core.editTask(task.id, {status:"Done"})`. Einheitlicher Flow: Status setzen + Datei nach archive/tasks/ verschieben.
<!-- SECTION:FINAL_SUMMARY:END -->
