---
id: BACK-0601
title: Refactor src/file-system/operations.ts — Entity-Splits (1.847→200)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - refactoring
  - tech-debt
  - large-file
milestone: m-15
dependencies: []
priority: high
ordinal: 384000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
operations.ts ist mit 1.847 Zeilen die drittgrößte Datei und die FileSystem-Klasse mischt Lock-Management, Task/Draft/Decision/Document/Milestone/Config File-Operationen, Migration und Utility-Funktionen.

Ziel: Pro Entity-Typ eine eigene Datei (lock, task-file-ops, draft-file-ops, milestone-file-ops, config-file-ops, document-file-ops, decision-file-ops, utils). FileSystem wird zur schmalen Facade.

Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2c
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 7 Sub-Tasks erledigt
- [ ] #2 operations.ts ≤ 300 Zeilen
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Extraktions-Reihenfolge:
1. src/file-system/lock.ts — LockError + withCreateLock (unabhängig)
2. src/file-system/task-file-operations.ts — saveTask, loadTask, listTasks, archiveTask
3. src/file-system/draft-file-operations.ts — saveDraft, loadDraft, listDrafts, promoteDraft, demoteTask
4. src/file-system/milestone-file-operations.ts — buildMilestoneIdentifierKeys, listMilestones, createMilestone, renameMilestone, archiveMilestone
5. src/file-system/config-file-operations.ts — loadConfig, saveConfig, parseConfig, serializeConfig
6. src/file-system/document-file-operations.ts — saveDocument, listDocuments, loadDocument, archiveDocument
7. src/file-system/decision-file-operations.ts — saveDecision, loadDecision, listDecisions
8. src/file-system/utils.ts — detectLanguage, sanitizeFilename, ensureDirectoryExists
9. FileSystem Facade — bleibt in operations.ts, importiert Sub-Module, delegiert
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Jedes Sub-Modul bekommt den backlogDir-Pfad als Parameter statt über Filesystem-Klasse zu gehen. Das macht die Module testbar und unabhängig.

Die FileSystem-Klasse wird dünn — nur noch Factory + Directory-Getter + kurze Delegationsmethoden.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->