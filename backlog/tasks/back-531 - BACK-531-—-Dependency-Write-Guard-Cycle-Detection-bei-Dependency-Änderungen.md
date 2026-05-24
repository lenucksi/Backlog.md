---
id: BACK-531
title: 'BACK-531 — Dependency Write-Guard: Cycle-Detection bei Dependency-Änderungen'
status: Done
assignee: []
created_date: '2026-05-22 18:58'
updated_date: '2026-05-24 13:20'
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
- [x] #1 findCyclePath() gibt Zyklus-Pfad oder null zurück
- [x] #2 validateDependencyChange() integriert in resolveDependenciesFromInput()
- [x] #3 10 Unit-Tests (simple cycle, complex, self-loop, no cycle)
- [x] #4 force:boolean auf TaskUpdateInput für Bypass
- [x] #5 CLI task edit mit zirkulären Dependencies → Error mit Cycle-Path
- [x] #6 MCP task_edit validiert via core.editTask()
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Neue Datei src/utils/dependency-validation.ts. Exports: findCyclePath(taskId, newDeps, allTasks): string[]|null — DFS von newDep aus, folgt dependency-Ketten, erkennt wenn taskId erreicht wird. validateDependencyChange(taskId, newDeps, allTasks): {valid:true} | {valid:false, cycle}. Self-Loop (A→A) wird via early-check abgefangen. Integration in resolveDependenciesFromInput() in backlog.ts: nach existierender validation + mutation, vor task.dependencies = currentDependencies. force:boolean auf TaskUpdateInput in types/index.ts.

Serena-Tool: Write (neue Datei) für dependency-validation.ts

Serena-Tool: serena_replace_symbol_body(Core/editTask) in backlog.ts für cycle check

Serena-Tool: serena_replace_content für import + cycle-check in resolveDependenciesFromInput
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Neue Utility `src/utils/dependency-validation.ts` mit `findCyclePath()` (DFS) und `validateDependencyChange()`. Integration in `resolveDependenciesFromInput()` in backlog.ts: nachdem Dependencies validiert wurden, wird ein Cycle-Check gemacht. `force: boolean` auf `TaskUpdateInput` erlaubt bypass. 10 Unit-Tests in `dependency-validation.test.ts` decken simple cycles, komplexe cycles, self-loops, und no-cycle ab.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->
