---
id: BACK-511
title: 'Coverage: Kleine 0%-Files auf ≥60% bringen'
status: Done
assignee: []
created_date: '2026-05-20 22:03'
updated_date: '2026-05-22 15:38'
labels:
  - coverage
  - testing
  - tech-debt
milestone: m-13
dependencies:
  - BACK-510
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fünf kleine Dateien mit 0% Coverage und <100 Lines. Leichte Beute für Coverage-Steigerung:

- `src/utils/clipboard.ts` (0%, 43 lines) — Promise-basierte clipboard.writeText / readText
- `src/utils/task-watcher.ts` (0%, 56 lines) — Task-Änderungen per fs.watch überwachen
- `src/core/cross-branch-tasks.ts` (12.1%, 173 lines) — Cross-Branch Task Migration
- `src/readme.ts` (6.3%, 63 lines) — README-Generierung aus Backlog-Daten
- `src/commands/overview.ts` (0%, 17 lines) — CLI overview-Befehl

Jede Datei hat fokussierte, isolierte Logik — gut testbar ohne grosse Setup-Kosten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/utils/clipboard.ts erreicht ≥60% Line Coverage
- [ ] #2 src/utils/task-watcher.ts erreicht ≥60% Line Coverage
- [ ] #3 src/core/cross-branch-tasks.ts erreicht ≥60% Line Coverage
- [ ] #4 src/readme.ts erreicht ≥60% Line Coverage
- [ ] #5 src/commands/overview.ts erreicht ≥60% Line Coverage
- [ ] #6 Keine bestehenden Tests brechen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
