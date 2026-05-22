---
id: BACK-492.8
title: 'TechDebt: Extract CLI command handlers from cli.ts into separate modules'
status: Done
assignee: []
created_date: '2026-05-20 23:02'
updated_date: '2026-05-22 01:13'
labels:
  - tech-debt
  - refactoring
  - cli
dependencies: []
parent_task_id: BACK-492
priority: medium
ordinal: 179100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube identifiziert `src/cli.ts` als mit Abstand komplexeste Datei: 6 Funktionen mit CC >35, darunter eine mit **268** (Limit: 15). Die Datei enthält ~1.500 LOC reine Command-Definitionen, die in separate Module unter `src/commands/` extrahiert werden sollen.

Jedes CLI-Command (task, board, doc, config, milestone, search, etc.) hat bereits eine Datei in `src/commands/`. Aber die main `cli.ts` enthält trotzdem noch zu viel Inline-Logik (Option-Definitionen, Subcommand-Routing, Help-Text-Erzeugung).

Ziel: `cli.ts` auf reines Command-Registration reduzieren, Logik in die Command-Module verschieben.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cli.ts hat keine Funktion mehr mit CC >25
- [ ] #2 Command-Definitionen sind in die jeweiligen src/commands/*.ts Module ausgelagert
- [ ] #3 bun run check . und bun test bestehen
- [ ] #4 --help zeigt gleiche Ausgabe wie vorher
- [ ] #5 Keine Regression in bestehenden Tests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
