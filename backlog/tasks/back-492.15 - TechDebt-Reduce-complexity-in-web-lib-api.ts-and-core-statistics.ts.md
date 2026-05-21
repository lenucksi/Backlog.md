---
id: BACK-492.15
title: 'TechDebt: Reduce complexity in web/lib/api.ts and core/statistics.ts'
status: To Do
assignee: []
created_date: '2026-05-20 23:43'
labels:
  - tech-debt
  - refactoring
  - web
  - api
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/web/lib/api.ts` Zeile 165 (CC 40) — Web API-Client mit Auth/Error-Handling, verschachtelten Fetch-Aufrufen und Response-Verarbeitung
- `src/core/statistics.ts` Zeile 25 (CC 38) — Statistik-Berechnung mit vielen aggregierenden Schleifen und bedingten Zählern

Beides gut abgegrenzte Module. Extraktion von Auth-Helpern, Error-Decodern und Aggregations-Helfern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 api.ts Zeile 165 CC ≤25
- [ ] #2 statistics.ts Zeile 25 CC ≤25
- [ ] #3 bun run check . und bun test bestehen
- [ ] #4 Keine API-Änderungen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
