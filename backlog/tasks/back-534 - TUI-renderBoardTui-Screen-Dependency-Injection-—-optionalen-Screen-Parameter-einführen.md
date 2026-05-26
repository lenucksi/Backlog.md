---
id: BACK-534
title: "TUI: renderBoardTui Screen-Dependency-Injection — optionalen
  Screen-Parameter einführen"
status: To Do
assignee: []
created_date: 2026-05-26 14:38
labels:
  - refactor
  - tui
  - testing
  - termless
dependencies: []
priority: medium
ordinal: 257000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`renderBoardTui` in `src/ui/board.ts` erzeugt selbstständig einen blessed screen auf `process.stdout`. Das verhindert Testbarkeit mit termless (`@termless/core` + `vterm.js`).

**Änderung**: `renderBoardTui` bekommt einen optionalen `screen?: ScreenInterface` Parameter. Wenn gesetzt, wird dieser verwendet statt `createScreen()` aufzurufen. Der Caller ist für `screen.destroy()` verantwortlich.

**Ziel**: Gen 1 Mock-Tests (`board-coverage.test.ts`) können dann auf termless portiert werden, indem ein termless-kompatibler Screen übergeben wird statt blessed zu mocken.

**Aufwand**: ~2h — Refactor, Tests, Validierung
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->