---
id: BACK-512
title: 'Coverage: Grosse 0%-TUI-Files initial testen'
status: To Do
assignee: []
created_date: '2026-05-20 22:03'
updated_date: '2026-05-20 22:04'
labels:
  - coverage
  - testing
  - tech-debt
  - tui
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
- [ ] #1 src/cli.ts erreicht ≥20% Line Coverage (kritische/neue Commands)
- [ ] #2 src/ui/board.ts erreicht ≥20% Line Coverage
- [ ] #3 src/ui/task-viewer-with-search.ts erreicht ≥20% Line Coverage
- [ ] #4 src/ui/sequences.ts erreicht ≥20% Line Coverage
- [ ] #5 Existierende Tests bleiben grün
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
