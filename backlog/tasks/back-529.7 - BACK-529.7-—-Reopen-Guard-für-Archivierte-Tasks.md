---
id: BACK-529.7
title: BACK-529.7 — Reopen Guard für Archivierte Tasks
status: To Do
assignee: []
created_date: '2026-05-22 18:42'
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
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
