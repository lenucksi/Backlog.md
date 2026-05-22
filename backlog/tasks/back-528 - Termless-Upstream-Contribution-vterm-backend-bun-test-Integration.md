---
id: BACK-528
title: 'Termless Upstream Contribution: vterm-backend + bun-test Integration'
status: To Do
assignee: []
created_date: '2026-05-22 12:47'
labels:
  - contribution
  - upstream
  - open-source
  - termless
  - vterm
dependencies: []
references:
  - 'https://github.com/beorn/termless'
  - 'https://github.com/beorn/vterm'
  - 'https://terminfo.dev'
priority: medium
ordinal: 234000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nach dem erfolgreichen PoC (vterm.js Adapter + termless + bun:test) soll die Lösung upstream an termless (github.com/beorn/termless) contributet werden.

## Contribution Package 1: @termless/vterm-backend
Unser `vterm-backend.ts` als offizielles Backend-Package im termless Monorepo.

### Was es macht
- Wraps `vterm.js` (Standalone npm, 100% terminfo.dev, 161/161 Features)
- Implementiert `TerminalBackend` Interface aus @termless/core
- Intercepts DA1/DA2/DSR Queries → forwardt Responses via `onResponse` zurück durch PTY
- Zero native dependencies, pure TypeScript

### Was dazu gehört
- packages/vterm-backend/package.json
- packages/vterm-backend/src/backend.ts (unser Adapter)
- packages/vterm-backend/src/index.ts (Re-Export)
- Tests: Cell-Level, Alt-Screen, blessed TUI Smoke
- README mit Nutzungshinweisen

### Für das Monorepo anpassen
- Relative Imports (`../../../src/types.ts`) statt `@termless/core` — wie die anderen Backends
- In backends.json als `"vterm": { "package": "@termless/vterm-backend" }`

## Contribution Package 2: bun:test Matcher Info
- `@termless/core` exportiert bereits `termlessMatchers` via `jest-matchers.ts`
- Diese funktionieren out-of-the-box mit `bun:test` via `expect.extend(termlessMatchers)`
- Kein neues Package nötig — nur Dokumentation im README ergänzen
- Vital für Bun-Nutzer (170+ Testfiles in diesem Projekt)

## Zeitplan
- PR an beorn/termless nach Fertigstellung von BACK-527
- Kontakt: @beorn (Bjørn Stabell) — Autor von termless + vterm.js + terminfo.dev
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PR an beorn/termless mit @termless/vterm-backend erstellt
- [ ] #2 termless README auf bun:test Kompatibilität (termlessMatchers + expect.extend) hingewiesen
- [ ] #3 Beispiel-Code im Projekt für Referenz-Implementierung dokumentiert
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
