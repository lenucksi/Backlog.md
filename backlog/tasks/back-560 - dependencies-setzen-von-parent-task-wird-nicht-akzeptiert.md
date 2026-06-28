---
id: BACK-560
title: "dependencies: setzen von parent-task wird nicht akzeptiert"
status: To Do
assignee:
  - "@jo"
created_date: 2026-06-16 14:46
updated_date: 2026-06-20 17:29
labels:
  - bug
  - web-ui
  - mcp
  - rest
milestone: m-10
dependencies: []
references:
  - BACK-559
modified_files:
  - src/types/index.ts
  - src/server/utils.ts
  - src/utils/task-edit-builder.ts
  - src/types/task-edit-args.ts
  - src/core/backlog.ts
priority: high
ordinal: 312000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wenn man im Web UI (TaskDetailsModal) eine Parent Task setzt und speichert, ist der Wert nach dem Schliessen der Karte weg. Der `parentTaskId`-Wert wird korrekt vom Web UI gesendet, aber auf dem Server in `buildTaskUpdateInputFromBody()` nicht aus dem Body extrahiert und in `applyTaskUpdateInput()` in `backlog.ts` nicht auf die Task angewandt.

**3 Lücken:**
1. `src/types/index.ts` — `TaskUpdateInput` hat kein `parentTaskId?: string` (aber `TaskCreateInput` hat es)
2. `src/server/utils.ts` — `buildTaskUpdateInputFromBody()` extrahiert `parentTaskId` nicht
3. `src/core/backlog.ts` — `applyTaskUpdateInput()` wendet `parentTaskId` nicht an

**Zusätzlich (MCP):**
- `src/types/task-edit-args.ts` — `TaskEditArgs` hat kein `parentTaskId`
- `src/utils/task-edit-builder.ts` — `buildTaskUpdateInput()` verarbeitet `parentTaskId` nicht

**User-Erwartung:** Wenn man eine Parent Task setzt, sollte die Parent-Task-ID auch automatisch als Dependency eingetragen werden (bidirektional). Wenn man `parentTaskId` auf Task-A setzt, soll Task-A-ID automatisch in `dependencies` von Task-B (dem Parent) auftauchen.

**Prerequisite für BACK-559** (Subtask Promotion/Demotion) — ohne funktionierendes `parentTaskId`-Update kann Demotion/Promotion nicht über die Update-Pipeline arbeiten.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `parentTaskId` kann via `task_edit` MCP-Tool gesetzt und gelöscht werden
- [ ] #2 `parentTaskId` kann via REST `PUT /api/tasks/:id` gesetzt und gelöscht werden
- [ ] #3 Web UI TaskDetailsModal speichert `parentTaskId` persistent (schliessen + neu öffnen hält)
- [ ] #4 Setzen von `parentTaskId` fügt automatisch Child-ID als Dependency beim Parent hinzu (optional, documented as known behaviour)
- [ ] #5 Löschen von `parentTaskId` entfernt NICHT die automatische Dependency (nur explizites Dependency-Management)
- [ ] #6 `bunx tsc --noEmit` passes
- [ ] #7 `bun test` passes (neue + bestehende Tests)
- [ ] #8 `bun run check .` passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Step 1: Type layer — `TaskUpdateInput` + `TaskEditArgs`
- `src/types/index.ts`: Add `parentTaskId?: string` to `TaskUpdateInput` interface (like `TaskCreateInput` already has it)
- `src/types/task-edit-args.ts`: Add `parentTaskId?: string` to `TaskEditArgs`

### Step 2: Server layer — `buildTaskUpdateInputFromBody`
- `src/server/utils.ts`: Add extraction for `parentTaskId` in `buildTaskUpdateInputFromBody()`:
  - Check `"parentTaskId" in updates`
  - Handle null/undefined/empty → clear; string → set
  - Pattern: same as milestone handling

### Step 3: MCP builder — `buildTaskUpdateInput`
- `src/utils/task-edit-builder.ts`: Add `parentTaskId` handling in `applyScalarFields()` or a new field handler

### Step 4: Core layer — `applyTaskUpdateInput`
- `src/core/backlog.ts`: Add `parentTaskId` handling in `applyTaskUpdateInput()`:
  - If `parentTaskId` is undefined → skip (no change)
  - If `parentTaskId` is empty string/null → delete `task.parentTaskId`
  - If `parentTaskId` is set → normalize and set
  - Validate: parent task must exist (load task by ID)

### Step 5 (Optional): Auto-dependency
- When `parentTaskId` is set on a task, also add this task's ID to the parent task's `dependencies` array
- This requires: loading parent task, checking if child ID is already in deps, adding if not, saving parent
- Implement in `applyTaskUpdateInput` AFTER parentTaskId is set

### Step 6: Tests
- Unit test: `buildTaskUpdateInputFromBody` extracts `parentTaskId`
- Unit test: `applyTaskUpdateInput` sets/clears `parentTaskId`
- Integration test: Web UI → REST → Core → File roundtrip
- MCP test: `task_edit` with `parentTaskId`
<!-- SECTION:PLAN:END -->