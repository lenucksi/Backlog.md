---
id: BACK-531
title: 'BACK-531 — Dependency Write-Guard: Cycle-Detection bei Dependency-Änderungen'
status: To Do
assignee: []
created_date: '2026-05-22 18:58'
labels:
  - fix
  - validation
  - dependencies
  - cli
  - mcp
milestone: m-13
dependencies: []
references:
  - BACK-217
  - BACK-530
  - doc-009
  - src/core/sequences.ts
priority: high
ordinal: 254000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Tasks in Backlog.md können Dependencies auf andere Tasks setzen (`dependencies: ["BACK-123", "BACK-456"]`). Wenn User zirkuläre Dependencies anlegen (A→B→C→A), entstehen Deadlocks die erst in Statistics oder gar nicht auffallen.

Ein Dependency Write-Guard verhindert das **beim Setzen der Dependency**, nicht erst nachträglich.

## What

### 1. Neue Utility: `validateDependency(taskId, newDepId, allTasks)`
- DFS-Reachability: Kann man von `newDepId` aus `taskId` erreichen?
- Wenn ja → Zyklus → Error + Cycle-Path
- Wenn nein → OK
- ~30-40 lines, pure Funktion

### 2. Neue Utility: `findCyclePath(taskId, newDepId, allTasks)`
- Gibt den Zyklus-Pfad als Array zurück: `["BACK-1", "BACK-2", "BACK-3", "BACK-1"]`
- Für User-Readable Fehlermeldungen

### 3. CLI Integration
- `src/commands/task.ts`: `handleTaskEditCommand` ruft vor dem Setzen von `dependencies` den Guard auf
- Error: "Error: Circular dependency detected (BACK-1 → BACK-2 → BACK-3 → BACK-1)"
- `--force`: Überschreibt den Guard (für Edge Cases)

### 4. MCP Integration
- `src/mcp/tools/tasks/handlers.ts`: `updateTask` Handler validiert Dependencies
- Error Response Schema: `{ error: "circular_dependency", cycle: ["BACK-1", "BACK-2", "BACK-3", "BACK-1"] }`
- Tool-Parameter: `force` optional boolean

### 5. WebUI Integration
- TaskDetailsModal / Dependency-Editor: Bei cycle → Modal "Circular Dependency" + Cycle-Path
- Buttons: "Cancel" | "Save anyway"

### 6. Core Integration
- `core.editTask()` ruft Guard auf (damit ALLE Wege abgedeckt sind)
- API-Change: `editTask(id, fields, { force?: boolean })`

### 7. Tests
- Unit: Simple cycle, complex cycle, self-loop, no cycle, cycle with --force
- Integration: CLI full command, MCP tool, API endpoint

## Implementation plan

1. Create `src/utils/dependency-validation.ts`:
   - `validateDependency(taskId, newDepId, allTasks): { valid: boolean; cycle?: string[] }`
   - `findCyclePath(taskId, newDepId, allTasks): string[]` (DFS)
2. Core: `editTask()` ruft `validateDependency` vor dem Speichern
3. CLI: Error-Handling + `--force` Flag
4. MCP: Error Response + `force` Parameter
5. WebUI: Modal bei Zyklus
6. Tests
7. `bunx tsc --noEmit` + `bun run check .` + `bun test`

## Files
- Neu: `src/utils/dependency-validation.ts`
- Modify: `src/core/backlog.ts`
- Modify: `src/commands/task.ts`
- Modify: `src/mcp/tools/tasks/handlers.ts`
- Modify: `src/mcp/tools/tasks/schemas.ts`
- Modify: `src/web/components/TaskDetailsModal.tsx`
- Neu: `src/test/dependency-validation.test.ts`

## References
- doc-009 (Blocked/Deadlocked Research) — Cycle Detection in sequences.ts
- src/core/sequences.ts — Kahns Algorithmus mit Cycle-Detection (existiert, aber für write-time zu schwergewichtig)
- src/core/statistics.ts — Dependency-basierte Blocked-Liste
- BACK-530 — Blocked/Deadlocked Tasks (parent)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 validateDependency(taskId, newDepId) Funktion existiert — DFS-Reachability-Check (< 50 lines)
- [ ] #2 #2 CLI: `task edit --dep TASK-3` auf TASK-1 validiert → Error + Cycle-Path bei Zyklus
- [ ] #3 #3 CLI: `--force` Flag zum Überschreiben des Guards
- [ ] #4 #4 MCP: `task_edit` mit dependencies-Change validiert → Error + Cycle-Path
- [ ] #5 #5 WebUI: Dependency-Edit zeigt Modal-Warnung bei Zyklus
- [ ] #6 #6 findCyclePath() gibt den Zyklus-Pfad zurück (z.B. ['TASK-1','TASK-2','TASK-3','TASK-1'])
- [ ] #7 #7 Alle Tests grün
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
