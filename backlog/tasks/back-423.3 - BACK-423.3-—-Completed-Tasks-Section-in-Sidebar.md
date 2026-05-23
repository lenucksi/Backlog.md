---
id: BACK-423.3
title: BACK-423.3 — Completed Tasks Section in Sidebar
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 17:23'
updated_date: '2026-05-22 17:54'
labels:
  - web-ui
  - tasks
  - feature
milestone: m-8
dependencies: []
modified_files:
  - src/file-system/operations.ts
  - src/server/handlers/tasks.ts
  - src/server/router.ts
  - src/web/lib/api.ts
  - src/web/components/SideNavigation.tsx
  - src/web/App.tsx
  - src/web/components/Layout.tsx
parent_task_id: BACK-423
priority: medium
ordinal: 244000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Tasks die terminalStatus (Completed/Archived) erreichen, verschwinden aus Board und Task-Liste. Nutzer haben keine Möglichkeit, completed Tasks nochmal einzusehen ohne CLI oder Suche. Das ist "out of sight, out of mind".

## What

**Sidebar Section:**
- CollapsibleGroup "Completed (N)" unter Statistics
- Nutzt existierenden `GET /api/tasks` Endpoint mit `status=<terminalStatuses>` Filter
- Item: Task-Titel + Completion-Datum/Status
- Klick → öffnet existierende TaskDetailModal (read-only)
- "Reopen" Button → setzt Status zurück auf "To Do"

**Backend:**
- Kein neuer Endpoint nötig falls Option A (reuse GET /api/tasks mit status-Filter)
- Der Client kennt terminalStatuses aus der Config

**Frontend:**
- SideNavigation.tsx: Neue CollapsibleGroup Section
- web/lib/api.ts: `fetchCompletedTasks()` oder reuse `fetchTasks({ status: terminalStatuses })`

## Implementation plan

1. Read terminalStatuses config handling (src/web/ oder src/core/)
2. Add `fetchCompletedTasks()` in web/lib/api.ts (oder reuse)
3. Add CollapsibleGroup Section in SideNavigation.tsx
4. Wire Reopen-Action (calls task edit → status: "To Do")
5. Typecheck + lint + test

## Files
- Modify: `src/web/lib/api.ts`
- Modify: `src/web/components/SideNavigation.tsx`

## Dependencies
- BACK-423.1 (CollapsibleGroup component)
- BACK-462 (terminalStatuses config, Done)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Completed Tasks Section in Sidebar aufklappbar
- [ ] #2 #2 Zeigt Tasks deren Status in terminalStatuses config definiert ist
- [ ] #3 #3 Klick öffnet existierende Task-Detail-View (read-only)
- [ ] #4 #4 Reopen-Button setzt Task auf 'To Do' und entfernt aus Completed Section
- [ ] #5 #5 Aktualisiert bei Refresh/Task-Mutation
- [ ] #6 #6 Alle Tests grün
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Completed Tasks sidebar section using CollapsibleGroup. Fetches completed tasks via GET /api/tasks/completed endpoint + reopen via POST /api/tasks/:id/reopen. Each item shows task title + status badge, clickable to TaskDetailModal, with Reopen button to restore to To Do.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
