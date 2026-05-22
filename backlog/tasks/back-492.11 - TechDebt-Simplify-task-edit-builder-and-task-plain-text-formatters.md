---
id: BACK-492.11
title: 'TechDebt: Simplify task-edit-builder and task-plain-text formatters'
status: Done
assignee: []
created_date: '2026-05-20 23:02'
updated_date: '2026-05-22 15:38'
labels:
  - tech-debt
  - refactoring
  - formatters
milestone: m-15
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/utils/task-edit-builder.ts` Zeile 28 (CC 51) — Edit-Builder mit stark verschachtelten Conditional-Chains
- `src/formatters/task-plain-text.ts` Zeile 61 (CC 31) — Plain-Text-Formatierung mit zu vielen `if`-Ebenen

Beides Formatierungs-/Builder-Funktionen. Gemeinsame Muster in Helfer extrahieren, Verschachtelung reduzieren.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 task-edit-builder.ts CC ≤25
- [ ] #2 task-plain-text.ts CC ≤20
- [ ] #3 Gemeinsame Formatierungs-Helfer extrahiert (wenn sinnvoll)
- [ ] #4 bun run check . und bun test bestehen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
