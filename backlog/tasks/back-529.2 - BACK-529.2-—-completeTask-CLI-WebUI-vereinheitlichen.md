---
id: BACK-529.2
title: BACK-529.2 — completeTask() CLI + WebUI vereinheitlichen
status: To Do
assignee: []
created_date: '2026-05-22 18:42'
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
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
