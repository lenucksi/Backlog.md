---
id: BACK-509
title: 'Coverage: Push find-backlog-root.ts, assignee.ts, editor.ts über 85%'
status: Done
assignee: []
created_date: '2026-05-20 22:03'
updated_date: '2026-05-22 15:38'
labels:
  - coverage
  - testing
  - tech-debt
milestone: m-13
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drei kleine Dateien mit weniger als 10 uncovered Lines, die zusammen auf >85% Coverage gebracht werden können:

- `src/utils/find-backlog-root.ts` (84.4%, 7 uncovered lines)
- `src/utils/assignee.ts` (83.3%, 1 uncovered line)
- `src/utils/editor.ts` (83.6%, 9 uncovered lines)

Jede Datei hat simple Logik — Tests sind schnell geschrieben.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 find-backlog-root.ts erreicht ≥85% Line Coverage in SonarQube
- [ ] #2 assignee.ts erreicht ≥85% Line Coverage in SonarQube
- [ ] #3 editor.ts erreicht ≥85% Line Coverage in SonarQube
- [ ] #4 Alle neuen Tests laufen unter bun test --coverage
- [ ] #5 Keine bestehenden Tests brechen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
