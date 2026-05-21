---
id: BACK-492.12
title: 'TechDebt: Reduce function nesting depth in board.ts (S2004)'
status: Done
assignee: []
created_date: '2026-05-20 23:02'
updated_date: '2026-05-21 22:58'
labels:
  - tech-debt
  - refactoring
  - tui
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube: 8× S2004-Verstöße in `src/ui/board.ts` (Zeilen 465, 481, 1080, 1095, 1117, 1132, 1080, 1132).

Das blessed-TUI-Board hat extrem tiefe Callback-Verschachtelung (Event-Handler in Event-Handler in Schleifen in Conditionals). Jede >4-Ebenen-verschachtelte anonyme Funktion muss in eine benannte oder arrow-function-Variable extrahiert werden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 board.ts hat keine S2004-Verstöße mehr (max 4 Ebenen)
- [ ] #2 Funktionen sind in benannte Helfer extrahiert statt anonym verschachtelt
- [ ] #3 bun run check . und bun test bestehen
- [ ] #4 Keine UI-Verhaltensänderungen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
