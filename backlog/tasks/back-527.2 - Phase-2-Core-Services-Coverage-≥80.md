---
id: BACK-527.2
title: 'Phase 2: Core Services Coverage ≥80%'
status: Done
assignee: []
created_date: '2026-05-22 12:59'
updated_date: '2026-05-22 15:38'
labels:
  - testing
  - coverage
  - phase-2
  - back-527
milestone: m-13
dependencies: []
parent_task_id: BACK-527
priority: high
ordinal: 236000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coverage für 5 Core-Service-Files mit aktuell 3-18% auf ≥80% bringen. Integration-Tests via Core API.

## Files
1. src/core/search-service.ts (8%, 446 lines) — Volltext-Suche
2. src/core/task-loader.ts (11%, ~700 lines) — Task-Loading + Branch-Normalisierung
3. src/core/content-store.ts (18%, ~900 lines) — Content-Caching
4. src/core/sequences.ts (3%, ~280 lines) — Sequence-Logik
5. src/core/backlog.ts (~50%, 2789 lines) — Core-Hauptdatei

## Methode
- `const core = new Core(testDir)` + `await core.method()` Pattern
- Bestehende Initialisierung via `initializeTestProject()`
- Siehe bestehende Tests in `src/test/core.test.ts` und `src/test/sequences.test.ts`

## Wichtige Patterns aus bestehenden Tests
```typescript
const core = new Core(testDir);
await initializeTestProject(core, "Test Project");
// Core-API aufrufen:
await core.createTask({ id: "test-1", title: "...", status: "To Do", ... });
const content = await core.getTaskContent("test-1");
```

## Bestehende Coverage
- search-service.ts: 8.68% (446 lines)
- task-loader.ts: 11.28% (groß, ~700 lines)
- content-store.ts: 18.51% (groß, ~900 lines)
- sequences.ts: 3.43%
- backlog.ts: 50.43% (2789 lines)

## Referenzen
- src/test/test-utils.ts: createUniqueTestDir, initializeTestProject, safeCleanup
- src/test/test-helpers.ts: createTaskPlatformAware etc.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Phase 2: Coverage maximization for 5 core service files completed.

## Summary

### New/expanded test files
1. **src/test/sequences-comprehensive.test.ts** — 24 tests for sequences uncovered paths (cycle detection, planMoveToSequence, planMoveToUnsequenced, edge cases)
2. **src/test/content-store-comprehensive.test.ts** — Added watcher lifecycle tests, document/decision lifecycle tests, getTasks with filter variants, upsertTask, ensureConfigWatcher, subscription edge cases
3. **src/test/task-loader-comprehensive.test.ts** — Added edge cases for resolveTaskConflict, getTaskLoadingMessage, normalizeId
4. **src/test/backlog-coverage.test.ts** — 59 tests for uncovered backlog.ts methods: contentStore, searchService, sequences operations, completeTask, acceptance criteria CRUD, milestone ops, docs/decisions, loadTasks, updateTasksBulk, reorderTask, promote/demote drafts, loadAllTasksForStatistics

### Coverage results (per-file, when running its test files)
| File | Initial | Final | Δ |
|------|---------|-------|---|
| search-service.ts | 8.68% | 100.00% | +91.32% |
| sequences.ts | 3.43% | 100.00% | +96.57% |
| task-loader.ts | 11.28% | 88.74% | +77.46% |
| content-store.ts | 18.51% | 81.52% | +63.01% |
| backlog.ts | 50.43% | 85.12% | +34.69% |

### Notable coverage gaps (remaining)
- **content-store.ts**: Watcher internals (createTaskWatcher, createDocumentWatcher, createManualRecursiveWatcher) remain uncovered as they require filesystem events
- **backlog.ts**: parseLegacyInlineArray, stripYamlComment, legacy migration paths, editTaskInTui, openEditor remain as edge cases

### Issues found
- planMoveToSequence always returns the moved task when targetSequenceIndex=1 (ordinal gets set even if task is already there)
- content-store subscribe emits "ready" immediately for already-initialized stores (correct behavior, but test needed adjustment)
- reorderTask requires orderedTaskIds and targetStatus (not just status)

All 214 tests across 10 files pass, 0 failures.
<!-- SECTION:FINAL_SUMMARY:END -->
