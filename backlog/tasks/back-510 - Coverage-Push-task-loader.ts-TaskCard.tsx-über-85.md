---
id: BACK-510
title: 'Coverage: Push task-loader.ts, TaskCard.tsx über 85%'
status: Done
assignee: []
created_date: '2026-05-20 22:03'
updated_date: '2026-05-22 15:38'
labels:
  - coverage
  - testing
  - web-ui
  - core
milestone: m-13
dependencies:
  - BACK-509
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zwei Dateien mit Coverage zwischen 83-84%, die auf >85% gebracht werden sollen:

- `src/web/components/TaskCard.tsx` (83.9%, 20 uncovered von 124)
  React-Komponente. Rendert Task-Infos im Board. Fehlende Tests für Edge Cases bei leeren/undefined Labels, langen Titeln, Klick-Handling.

- `src/core/task-loader.ts` (83.5%, 78 uncovered von 473)
  Core Task-Loader. Lädt Tasks aus dem Filesystem, parst Frontmatter. Fehlende Tests für Korrupted Files, leere Verzeichnisse, Encoding-Varianten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TaskCard.tsx erreicht ≥85% Line Coverage
- [ ] #2 task-loader.ts erreicht ≥85% Line Coverage
- [ ] #3 Edge Cases getestet
- [ ] #4 Keine bestehenden Tests brechen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
