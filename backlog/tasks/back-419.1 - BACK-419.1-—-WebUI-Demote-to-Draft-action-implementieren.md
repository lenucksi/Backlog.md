---
id: BACK-419.1
title: 'BACK-419.1 — WebUI: Demote-to-Draft action implementieren'
status: Done
assignee: []
created_date: '2026-05-22 10:29'
updated_date: '2026-05-22 15:39'
labels:
  - web-ui
  - demote
  - feature
milestone: m-8
dependencies: []
parent_task_id: BACK-419
priority: medium
ordinal: 231000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
WebUI hat keinen Demote-to-Draft Button. CLI und MCP haben beides. Nutzer müssen zur CLI wechseln um Tasks zurück ins Draft zu verschieben.

BACK-419 Analyse ergab: ~1h Aufwand, reines Glue-Code.

## What
### Backend
- `src/server/handlers/tasks.ts`: `handleDemoteTask` Handler (~12 lines, folgt `handleCompleteTask` Pattern)
- `src/server/router.ts`: Route `POST /api/tasks/:id/demote` (~4 lines)

### Frontend
- `src/web/lib/api.ts`: `demoteTask(id)` methode (~3 lines, folgt `completeTask` Pattern)
- `src/web/components/TaskDetailsModal.tsx`: Demote-Button in Sidebar neben Archive-Button (~20 lines)
  - Nur sichtbar im preview mode
  - Nur für non-draft, non-cross-branch tasks
  - Confirm-Dialog: "Demote to Draft? A new draft will be created and this task will be deleted."

### Flow
```
POST /api/tasks/:id/demote
  → handler load task
  → calls core.demoteTask(id)  // generates new draft ID, saves draft, deletes original
  → broadcastsTasksUpdated()
  → returns { success: true }
```

## Implementation plan
1. Handler in handlers/tasks.ts hinzufügen
2. Route in router.ts registrieren
3. API client method
4. UI Button + Confirm-Dialog
5. Manuell testen (build)
6. Typecheck + lint

## References
- BACK-419 (parent)
- src/server/handlers/tasks.ts — handleCompleteTask als Pattern
- src/core/backlog.ts — demoteTask()
- src/commands/task.ts — CLI demote als Referenz
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->



## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Demote to Draft action to the WebUI:

1. **`src/server/handlers/tasks.ts`** — Added `handleDemoteTask` handler following `handleCompleteTask` pattern. Loads task via `ctx.core.getTask()`, calls `ctx.core.demoteTask()`, broadcasts update, returns success.

2. **`src/server/router.ts`** — Added `handleDemoteTask` to the `RouteHandlers` type and registered `POST /api/tasks/:id/demote` route.

3. **`src/web/lib/api.ts`** — Added `demoteTask(id)` method following `completeTask` pattern (POST, no return data).

4. **`src/web/components/TaskDetailsModal.tsx`** — Added orange "Demote to Draft" button in the sidebar (preview mode only, non-draft tasks, non-cross-branch). Includes confirm dialog: "Demote to Draft? A new draft will be created and this task will be deleted." On success, refreshes task list and closes modal.
<!-- SECTION:FINAL_SUMMARY:END -->
