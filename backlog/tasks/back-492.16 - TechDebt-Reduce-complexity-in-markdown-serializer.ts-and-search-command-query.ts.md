---
id: BACK-492.16
title: >-
  TechDebt: Reduce complexity in markdown/serializer.ts and
  search-command-query.ts
status: Done
assignee: []
created_date: '2026-05-20 23:43'
updated_date: '2026-05-21 21:40'
labels:
  - tech-debt
  - refactoring
  - markdown
  - web
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/markdown/serializer.ts` Zeile 33 (CC 27) — Markdown-Serializer mit vielen Conditional-Blöcken für verschiedene Frontmatter-Felder
- `src/web/utils/search-command-query.ts` Zeile 89 (CC 23) — Such-Query-Parser mit verschachtelten Filter-Logiken

Kompakte Dateien, schnell extrahierbar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 serializer.ts CC ≤20
- [ ] #2 search-command-query.ts CC ≤15
- [ ] #3 bun run check . und bun test bestehen
- [ ] #4 Keine Verhaltensänderungen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
