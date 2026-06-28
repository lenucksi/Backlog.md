---
id: BACK-559.03
title: "REST + Web UI: promote/demote Subtask Endpoints und UI"
status: To Do
assignee: []
created_date: 2026-06-20 17:30
labels: []
milestone: m-10
dependencies:
  - BACK-559.01
modified_files:
  - src/server/router.ts
  - src/server/handlers/tasks.ts
  - src/web/lib/api.ts
  - src/web/components/TaskDetailsModal.tsx
  - src/web/components/TaskCard.tsx
  - src/web/components/TaskColumn.tsx
parent_task_id: BACK-559
priority: medium
ordinal: 323000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
REST-Endpoints und Web-UI-Komponenten für Subtask Promotion/Demotion.

**REST Endpoints (`src/server/router.ts` + `src/server/handlers/tasks.ts`):**
- `POST /api/tasks/:id/demote-to-subtask` — Body: `{ parentTaskId: string }`
  - Handler: `handleDemoteToSubtask(req, taskId)`
- `POST /api/tasks/:id/promote` — Kein Body nötig
  - Handler: `handlePromoteSubtask(req, taskId)`
- Pattern an `POST /api/tasks/:id/demote` (task→draft) anlehnen

**Web API Client (`src/web/lib/api.ts`):**
- `demoteTaskToSubtask(taskId, parentTaskId)` — API-Client-Methode
- `promoteSubtask(taskId)` — API-Client-Methode

**Web UI (`src/web/components/`):**
- **TaskDetailsModal.tsx**: "Make Subtask" Button + Parent-Auswahl-Dropdown; "Promote to Task" Button (wenn task.parentTaskId gesetzt ist)
- **TaskCard.tsx**: Kontextmenü-Eintrag "Make Subtask..." / "Promote to Task"
- **TaskColumn.tsx**: Oder Context-Menu in der Board-Ansicht
- Nach dem erfolgreichen Promote/Demote: Task neu laden und UI aktualisieren
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `POST /api/tasks/:id/demote-to-subtask` REST-Endpoint funktioniert
- [ ] #2 `POST /api/tasks/:id/promote` REST-Endpoint funktioniert
- [ ] #3 `apiClient.demoteTaskToSubtask()` und `apiClient.promoteSubtask()` existieren
- [ ] #4 TaskDetailsModal zeigt "Make Subtask" Button (für Top-Level-Tasks) + Parent-Auswahl
- [ ] #5 TaskDetailsModal zeigt "Promote to Task" Button (für Subtasks)
- [ ] #6 TaskCard hat Kontextmenü-Einträge für promote/demote
- [ ] #7 UI aktualisiert sich nach promote/demote ohne Seiten-Reload
- [ ] #8 `bunx tsc --noEmit` passes
- [ ] #9 `bun run check .` passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->