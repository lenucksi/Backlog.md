---
id: BACK-529.1
title: BACK-529.1 — backlog/completed/ → archive/tasks/ Migration
status: Archived
assignee: []
created_date: 2026-05-22 18:41
updated_date: 2026-05-24 12:31
labels:
  - cleanup
  - fix
  - migration
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: high
ordinal: 246000
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`backlog/completed/` ist ein unsinniger Top-Level-Ordner. Tasks gehören nach `backlog/archive/tasks/`. Der Ordner muss abgeschafft werden.

## What
1. `fs.completeTask()`: Ziel von `backlog/completed/` → `archive/tasks/` umstellen
2. `fs.listCompletedTasks()`: Quelle von `backlog/completed/` → `archive/tasks/` umstellen
3. Migration: 305 existierende Files aus `completed/` nach `archive/tasks/` verschieben
4. Alle Code-Pfade die auf `backlog/completed/` verweisen aktualisieren

## Implementation plan
1. Search `grep -r "backlog/completed" src/` für alle Referenzen
2. Update `operations.ts`: `completeTask` Ziel + `listCompletedTasks` Quelle
3. Files verschieben: `mv backlog/completed/*.md backlog/archive/tasks/`
4. `bunx tsc --noEmit`
5. `bun run check .`
6. `bun test`

## Files
- `src/file-system/operations.ts`
- `src/test/filesystem.test.ts` (expectations anpassen)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->