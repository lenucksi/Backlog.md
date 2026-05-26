---
id: BACK-535
title: "TUI: Gen 1 Mock-Tests auf termless portieren (board-coverage,
  sequences-coverage, task-viewer-coverage)"
status: To Do
assignee: []
created_date: 2026-05-26 14:38
labels:
  - refactor
  - tui
  - testing
  - termless
dependencies: []
priority: low
ordinal: 258000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nachdem `renderBoardTui` Screen-DI hat (TASK-A), können die alten Mock-basierten TUI-Tests auf `@termless/core` + `vterm.js` umgestellt werden.

**Betrifft**:
- `src/test/board-coverage.test.ts` (~1093 Zeilen, ~30 Test Cases)
- `src/test/sequences-coverage.test.ts` 
- `src/test/task-viewer-coverage.test.ts`

**Vorteil**: Echte Terminal-Emulation statt Hand-gerufener Handler. Tests testen das komplette TUI inklusive blessed-Rendering. Keine doppelten Key-Bindings mehr die übersehen werden.

**Aufwand**: ~4h pro Datei, insgesamt ~12h
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->