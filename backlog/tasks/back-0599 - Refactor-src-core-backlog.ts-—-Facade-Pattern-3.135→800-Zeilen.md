---
id: BACK-0599
title: Refactor src/core/backlog.ts — Facade Pattern (3.135→800 Zeilen)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-07-08 19:14
labels:
  - refactoring
  - tech-debt
  - large-file
milestone: m-15
dependencies: []
priority: high
ordinal: 375000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Core-Klasse in backlog.ts ist mit 3.138 Zeilen die grösste Datei im Projekt. 65+ public Methoden, ~500 Zeilen module-level pure Functions.

Ziel: Facade-Pattern. 10 Extraktions-Subtasks + 1 Facade-Subtask. backlog.ts schrumpft von 3.138 auf ≤800 Zeilen.

**Subtasks (11):**
- .01 Pure Task-Input-Resolver (18 module-level Functions + applyTaskUpdateInput)
- .02 ID-Generator (generateNextId + helpers)
- .03 Task-Operationen (Task-CRUD, ~500 Zeilen, grösster Block)
- .04 Draft-Operationen (promote/demote/archive)
- .05 Decision/Document (entity-crud, ~155 Zeilen)
- .06 Bulk + Sequence-Operationen (bulkArchive, reorderTask, sequences)
- .07 Facade — Rest auf ≤800 Zeilen
- .08 Statistics & Task-Query (queryTasks, loadTasks, loadAllTasksForStatistics, getTask etc.)
- .09 AC-Operations (add/remove/check/list AC + DoD Resolver)
- .10 Backlinks + Milestone-Operations (findBacklinks, archive/renameMilestone)
- .11 Config-Migration (legacy migration helpers)

**Cross-cutting Dedup (in Subtasks integriert):**
- formatDateStamp Helper (7× inline → 1×, in .03)
- withGitCommit Helper (14× shouldAutoCommit → 1×, in .03)
- resolveStringListField (3× label/reference/documentation → 1×, in .01)
- Generic criteria resolver (AC + DoD 70% Overlap, in .09)
- Merge loadAllTasksForStatistics + loadTasks (70% Overlap, in .08)

**Extraktion-Reihenfolge:**
Phase 1 (keine Dependencies): .01 → .02 → .05 → .10 → .11
Phase 2 (FileSystem): .08
Phase 3 (brauchen .01+.02): .03 → .04 → .09
Phase 4 (braucht .03): .06
Phase 5 (Abschluss): .07
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 11 subtasks erledigt
- [ ] #2 backlog.ts ≤ 800 Zeilen
- [ ] #3 formatDateStamp + withGitCommit + resolveStringListField Cross-cutting Helper in Subtasks integriert
- [ ] #4 loadAllTasksForStatistics + loadTasks konsolidiert (70% Overlap entfernt)
- [ ] #5 resolveAcceptanceCriteriaFromInput + resolveDefinitionOfDoneFromInput als generic criteria resolver konsolidiert
- [ ] #6 bun run check . --write passes
- [ ] #7 bun test --parallel passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Extraktions-Reihenfolge (abhängigkeitsfrei zuerst):

Phase 1 — Keine Dependencies:
- .01 Task-Input-Resolver (18 pure functions, inkl. resolveStringListField Konsolidierung)
- .02 ID-Generator (generateNextId, getActiveAndCompletedTaskIds)
- .05 Decision/Document CRUD (entity-crud.ts, inkl. withGitCommit Nutzung)
- .10 Backlinks + Milestones (findBacklinks, archive/renameMilestone)
- .11 Config-Migration (legacy migration helpers)

Phase 2 — Branch-Query:
- .08 Statistics & Task-Query (queryTasks, loadTasks, getTask, getTaskWithSubtasks, inkl. merge loadAllTasksForStatistics + loadTasks)

Phase 3 — Brauchen Resolver + ID-Generator:
- .03 Task-Operationen (Task-CRUD, ~500 Zeilen, inkl. formatDateStamp + withGitCommit Extraktion)
- .04 Draft-Operationen (promote/demote/archive, ~200 Zeilen)
- .09 AC-Operations (add/remove/check/list AC, ~245 Zeilen, inkl. generic criteria resolver)

Phase 4 — Braucht Task-Operations:
- .06 Bulk + Sequence-Operationen (bulkArchive, reorderTask, sequences, ~200 Zeilen)

Phase 5 — Abschluss:
- .07 Facade — Rest auf ≤800 Zeilen komprimieren
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->