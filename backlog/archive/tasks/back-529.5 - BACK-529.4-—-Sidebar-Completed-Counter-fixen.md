---
id: BACK-529.4
title: BACK-529.4 — Sidebar Completed Counter fixen
status: Archived
assignee: []
created_date: 2026-05-22 18:42
labels:
  - web-ui
  - fix
  - sidebar
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: high
ordinal: 250000
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Sidebar zeigt "Completed (305)" aber `count={0}` ist hardcoded → expandiert zeigt "No completed (305)".

## What
- Sidebar "Completed (N)" zählt alle Tasks mit terminalStatus (merged: `tasks/` + `archive/tasks/`)
- `count` aus `completedTasks.length` holen statt hardcoded 0

## Implementation plan
1. `SideNavigation.tsx`: `count={0}` → `count={completedTasks.length}`
2. `CollapsibleGroup` rendert dann korrekt die children statt "No completed"
3. `bunx tsc --noEmit`
4. `bun run check .`
5. `bun test`

## Files
- `src/web/components/SideNavigation.tsx`

## Dependencies
- BACK-529.1 (damit `completedTasks` aus `archive/tasks/` kommt)
- BACK-529.2 (damit CLI + WebUI konsistent archivieren)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->