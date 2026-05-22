---
id: BACK-492.17
title: 'TechDebt: Reduce duplication in cli.ts and board.ts'
status: Done
assignee: []
created_date: '2026-05-20 23:43'
updated_date: '2026-05-22 15:38'
labels:
  - tech-debt
  - refactoring
  - dry
milestone: m-15
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 180000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube Duplication Report:
- `src/cli.ts` (356 duplicated lines, 11 Blocks, 9.0%) — Command-Definitionen mit wiederholten Pattern (Option-Setup, Help-Text, Error-Handling)
- `src/ui/board.ts` (154 duplicated lines, 8 Blocks, 10.8%) — Wiederholte Event-Handler und Render-Logiken
- `src/web/components/Board.tsx` (95 duplicated lines, 7 Blocks, 14.0%) — Web-Board mit duplizierten Render-Pfaden
- `src/web/App.tsx` (78 duplicated lines, 6 Blocks, 13.4%) — App-Setup mit duplizierten Route-Definitionen

Ziel: Duplikationen durch gemeinsame Helfer oder Templates ersetzen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cli.ts Duplication ≤5%
- [ ] #2 board.ts Duplication ≤5%
- [ ] #3 Board.tsx Duplication ≤5%
- [ ] #4 App.tsx Duplication ≤5%
- [ ] #5 bun run check . und bun test bestehen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
