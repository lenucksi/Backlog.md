---
id: BACK-529.7
title: BACK-529.7 — Reopen Guard für Archivierte Tasks
status: Done
assignee: []
created_date: '2026-05-22 18:42'
updated_date: '2026-05-24 13:20'
labels:
  - fix
  - ux
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: medium
ordinal: 252000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Archivierte Tasks (in `archive/tasks/`) sollen nicht reopened werden können. Nur Tasks in `tasks/` mit terminalStatus sind reopen-fähig.

## What
- CL `task edit --status To Do` auf archived Task → Fehler "Cannot reopen archived task"
- WebUI: Kein Reopen-Button für archived Tasks
- MCP: `task_edit` mit status-Change auf archived Task → error

## Implementation plan
1. `core.editTask()`: Prüfen ob Task in `archive/tasks/` liegt → Fehler werfen
2. WebUI `TaskDetailsModal`: Reopen-Button nur zeigen wenn task NICHT archived
3. `bunx tsc --noEmit`
4. `bun run check .`
5. `bun test`

## Files
- `src/core/backlog.ts` (editTask)
- `src/web/components/TaskDetailsModal.tsx`

## Dependencies
- BACK-529.1 (archived Tasks Pfad)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 core.editTask() wirft Error bei archived Tasks via archiveDir-Check
- [x] #2 Error-Message: "Cannot edit archived task ID"
- [x] #3 Keine tsc Fehler
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Core.editTask() in backlog.ts: Vor updateTaskFromInput wird getTaskPath() aufgerufen und mit this.fs.archiveTasksDir verglichen. Wenn taskPath.startsWith(archiveDir) → Error. normalizeTaskId(taskId) für lesbare ID in der Fehlermeldung. Import war bereits vorhanden.

Serena-Tool: serena_replace_symbol_body(Core/editTask) in backlog.ts
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
`core.editTask()` prüft ob der Task-Pfad im archive-Tasks-Verzeichnis liegt. Wenn ja: `Error("Cannot edit archived task ...")`. Zusätzlich ist der WebUI "Mark as completed"-Button jetzt über `isTerminalStatus()` gesteuert (Config-aware).
<!-- SECTION:FINAL_SUMMARY:END -->
