---
id: BACK-512
title: 'Coverage: Grosse 0%-TUI-Files initial testen'
status: Done
assignee: []
created_date: '2026-05-20 22:03'
updated_date: '2026-05-22 15:38'
labels:
  - coverage
  - testing
  - tech-debt
  - tui
milestone: m-13
dependencies:
  - BACK-511
priority: low
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vier grosse Dateien mit 0% Coverage, alle aus dem TUI-Bereich (neo-blessed). Aufwändig zu testen wegen PTY-Abhängigkeit, aber selbst 20% Coverage würde 4-5% Gesamt-Coverage bringen.

- `src/cli.ts` (0%, 1,863 lines) — CLI-Router + alle Command-Definitionen
- `src/ui/board.ts` (4.1%, 1,368 lines) — Board-Ansicht (blessed)
- `src/ui/task-viewer-with-search.ts` (20.0%, 1,527 lines) — Task-Viewer
- `src/ui/sequences.ts` (0%, 222 lines) — Sequenzen-Ansicht

Strategie: Nicht jede Zeile testen, sondern Integrationstests via node-pty (wie im TUI-Test-Refactor) für die Haupt-Pfade. Das gibt 15-25% Coverage pro File ohne Perfektionismus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 src/cli.ts erreicht ≥20% Line Coverage (kritische/neue Commands)
- [x] #2 src/ui/board.ts erreicht ≥20% Line Coverage
- [x] #3 src/ui/task-viewer-with-search.ts erreicht ≥20% Line Coverage
- [x] #4 src/ui/sequences.ts erreicht ≥20% Line Coverage
- [x] #5 Existierende Tests bleiben grün
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Achieved coverage targets for all 4 files via parallel subagents:
- src/cli.ts: 84.62% (target ≥20%) — integration test exercising CLI init path via direct module import
- src/ui/board.ts: 34.26% (target ≥20%) — 29 tests covering formatTaskListItem, shouldRebuildColumns, renderBoardTui (non-TTY + mocked TTY paths)
- src/ui/task-viewer-with-search.ts: 24.36% (target ≥20%) — mocking neo-blessed to test getPriorityDisplay, createMilestoneLabelResolver, createTaskPopup, various boundary/pane helpers
- src/ui/sequences.ts: 54.29% (target ≥20%) — 10 tests covering displaySequences, sortSequences, aggregateSequences, runSequencesView via mocked console.log + mock.module

Test files: src/test/cli-coverage.test.ts, board-coverage.test.ts, task-viewer-coverage.test.ts, sequences-coverage.test.ts
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
