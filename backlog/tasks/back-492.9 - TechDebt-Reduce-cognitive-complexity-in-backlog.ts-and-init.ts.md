---
id: BACK-492.9
title: 'TechDebt: Reduce cognitive complexity in backlog.ts and init.ts'
status: Done
assignee: []
created_date: '2026-05-20 23:02'
updated_date: '2026-05-22 01:13'
labels:
  - tech-debt
  - refactoring
  - core
dependencies: []
parent_task_id: BACK-492
priority: medium
ordinal: 179200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/core/backlog.ts` Zeile 1111 (CC 72), Zeile 2681 (CC 45)
- `src/core/init.ts` Zeile 79 (CC 74)

Alle drei sind Core-Funktionen mit starker Verschachtelung. Extraktion von Hilfsfunktionen, Reduzierung der `if`-Tiefe durch Guard-Clauses und Early-Return, Aufteilung in Sub-Funktionen mit klaren Namen.

Keine API-Änderungen — nur internes Refactoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 backlog.ts Zeile 1111 CC ≤25
- [ ] #2 backlog.ts Zeile 2681 CC ≤25
- [ ] #3 init.ts Zeile 79 CC ≤25
- [ ] #4 bun run check . und bun test bestehen
- [ ] #5 Keine API-Änderungen oder Verhaltensänderungen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
