---
id: BACK-0630
title: "Phase 5: Blessed entfernen + Migration abschließen"
status: To Do
assignee: []
created_date: 2026-07-05 21:32
updated_date: 2026-07-05 21:33
labels:
  - opentui
  - ui2
  - phase-5
milestone: m-20
dependencies: []
references:
  - doc-0054
priority: low
ordinal: 417000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
1. `backlog ui2` wird zum Standard-Command (`backlog board`, `backlog task`, `backlog overview`)
2. Alte Commands (`backlog board` → blessed) werden durch ui2 ersetzt
3. `neo-neo-bblessed` aus dependencies entfernen
4. `@termless/core` + `vterm.js` aus devDependencies entfernen (ersetzt durch `@opentui/core/testing`)
5. Alte blessed-Test-Suite archivieren oder migrieren
6. `src/ui/` → `src/ui/archive/` verschieben

Risiken:
- blessed-Tests (zz-board-coverage, zz-task-viewer-coverage) müssen umgestellt oder gelöscht werden
- Rest-Kompatibilität mit unbekannten blessed-Features prüfen
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->