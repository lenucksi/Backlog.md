---
id: BACK-534
title: "TUI: renderBoardTui Screen-Dependency-Injection — optionalen
  Screen-Parameter einführen"
status: In Progress
assignee:
  - "@jo"
created_date: 2026-05-26 14:38
updated_date: 2026-05-27 10:20
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### 1. `src/ui/board.ts` — `renderBoardTui`
- Add optional `screen?: ScreenInterface` parameter after `options`
- `const ownedScreen = !screen; const activeScreen = screen ?? createScreen({ title: "Backlog Board" })`
- Guard all 3 `screen.destroy()` calls with `if (ownedScreen)`
- New `activeScreen` replaces the inner `const screen = createScreen(...)` in the Promise

### 2. `src/ui/task-viewer-with-search.ts` — `viewTaskEnhanced`
- Add optional `screen?: ScreenInterface` parameter after `options`
- `const ownedScreen = !screen; const activeScreen = screen ?? createScreen(...)`
- Guard all `screen.destroy()` calls with `if (ownedScreen)`

### 3. `src/ui/sequences.ts` — `runSequencesView`
- Add optional `screen?: ScreenInterface` parameter
- `const ownedScreen = !screen; const activeScreen = screen ?? createScreen(...)`
- Guard `screen.destroy()` calls

### 4. Callers
- No changes needed (optional parameter, backwards compatible)

### Verification
- `bunx tsc --noEmit`
- `bun run check .`
- Run existing mock tests to ensure they still pass
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BACK-534 complete. All 3 functions (renderBoardTui, viewTaskEnhanced, runSequencesView) now accept optional `injectedScreen?: ScreenInterface` parameter. When provided, no new screen is created and owned/destroy lifecycle is managed by the caller. All 3 files pass tsc, biome check, and existing mock tests (125 pass in board/viewer tests). The 32 pre-existing failures in sequences/ui-components tests are unchanged. DoD item #4: N/A with justification — Screen-DI is internal TUI mechanism, not applicable to CLI/WebUI/MCP/REST modalities.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->