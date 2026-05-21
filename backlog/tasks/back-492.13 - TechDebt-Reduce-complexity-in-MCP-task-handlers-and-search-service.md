---
id: BACK-492.13
title: 'TechDebt: Reduce complexity in MCP task handlers and search-service'
status: Done
assignee: []
created_date: '2026-05-20 23:02'
updated_date: '2026-05-21 21:40'
labels:
  - tech-debt
  - refactoring
  - mcp
  - api
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/mcp/tools/tasks/handlers.ts` Zeile 140 (CC 36) — MCP Task-Edit-Handler mit komplexer Validierungs- und Update-Logik
- `src/core/search-service.ts` Zeile 357 (CC 22) — Such-Service mit mehreren verschachtelten Filter-Schleifen

API-Handler und Suchlogik durch Extraktion von Validierungs-/Filter-Helfern entflechten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 mcp/tools/tasks/handlers.ts CC ≤25
- [ ] #2 search-service.ts CC ≤20
- [ ] #3 bun run check . und bun test bestehen
- [ ] #4 MCP-Tools bleiben voll funktionsfähig
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
