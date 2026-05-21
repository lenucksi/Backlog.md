---
id: BACK-492.10
title: 'TechDebt: Refactor server/index.ts routing and handler registration'
status: To Do
assignee: []
created_date: '2026-05-20 23:02'
labels:
  - tech-debt
  - refactoring
  - server
dependencies: []
parent_task_id: BACK-492
priority: medium
ordinal: 179300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/server/index.ts` Zeile 880 (CC 43), Zeile 694 (CC 35), Zeile 1091 (CC 21)

Der Server-Modul kombiniert Express-Route-Definition, Middleware-Setup, Handler-Registrierung und Error-Handling in einer Datei. Extraktion des Route-Builders in ein separates Modul, Vereinfachung der verschachtelten Middleware-Struktur.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 server/index.ts Zeile 880 CC ≤25
- [ ] #2 server/index.ts Zeile 694 CC ≤25
- [ ] #3 Server-API-Endpunkte bleiben identisch
- [ ] #4 bun run check . und bun test bestehen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
