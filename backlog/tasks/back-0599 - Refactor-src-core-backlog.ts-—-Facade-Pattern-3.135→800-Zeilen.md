---
id: BACK-0599
title: Refactor src/core/backlog.ts — Facade Pattern (3.135→800 Zeilen)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
labels:
  - refactoring
  - tech-debt
  - large-file
milestone: m-15
dependencies: []
priority: high
ordinal: 375000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
backlog.ts ist mit 3.135 Zeilen die größte Datei im Projekt. Der `Core` Klasse hat 84+ Methoden und mischt Task-CRUD, Draft-Management, ID-Generierung, Decision/Document CRUD, Bulk-Operations, Config-Migration, TUI-Editor-Integration, Sequenzen, Backlink-Suche und Statistik-Helper.

Ziel: Die Klasse per Facade-Pattern in spezialisierte Module zerlegen. backlog.ts bleibt als schmale Orchestrierung (~800 Zeilen) die an die neuen Module delegiert.

Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2a für detaillierte Analyse.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 7 Sub-Tasks erledigt (BACK-0599 bis BACK-0605)
- [ ] #2 backlog.ts ≤ 1.000 Zeilen
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->