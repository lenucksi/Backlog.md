---
id: BACK-0576
title: Adapt upstream test suite 4x speed-up approach (in-process API + --parallel)
status: In Progress
assignee: []
created_date: 2026-06-26 17:33
updated_date: 2026-06-29 10:54
labels:
  - upstream
  - infrastructure
  - tests
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/699
priority: high
ordinal: 328000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/pull/699 — Speed up test suite ~4x (291s → 75s): in-process API migration + bun --parallel

## What this is
Upstream PR beschleunigt die Test-Suite von ~291s auf ~75s (4×) durch:
1. **In-Process API Migration** — ~175 Subprocess CLI-Aufrufe durch direkte Core API Calls ersetzt (via `test-helpers.ts`)
2. **cli.test.ts Split** — 2.5k-Zeilen-Monolith in 8 fokussierte Dateien aufgeteilt
3. **`bun test --parallel`** — Bun 1.3.14, Worker-Pool-Verteilung
4. **`getVersionSync()`** — sync version reader für parallele Kompatibilität
5. **Test-Isolation-Fixes** — leaks behoben

## Status unserer Codebasis
- **Unsere Suite läuft ~290s** (identisch zu Upstream-Baseline)
- **Wir haben bereits `test-helpers.ts`** mit Core API Pattern (für Windows-Kompatibilität), aber **~245 Subprocess CLI Calls** (mehr als Upstreams ~175)
- **`cli.test.ts`**: 1779 Zeilen (kleiner als Upstreams 2.5k, aber immer noch Monolith)
- **BACK-539** (To Do) plant bereits cli.test.ts-Split als P1
- **BACK-536** (To Do) — ~37 Tests failen im Full Suite aber passen einzeln (Isolation)
- **Bun 1.3.14** — gleiche Version wie Upstream, `--parallel` ist verfügbar
- **`getVersionSync()`** — existiert nicht, `getVersion()` ist async

## Wichtig: Kein Straight Cherry-Pick
Upstreams Codebase hat divergiert. Die Test-Dateien haben andere Strukturen, andere Features, andere Namenskonventionen. Der *Approach* ist voll übertragbar, aber die Implementierung muss Custom sein.

## Implementation Plan

### Phase 0: Prerequisites
- BACK-536 lösen (Test-Isolation) — parallele Ausführung exposure flaky tests aggressiv
- `getVersionSync()` in `src/utils/version.ts` hinzufügen (trivial, 15 min)

### Phase 1: In-Process API Migration (~245 Calls → Core API)
- `test-helpers.ts` erweitern: `getCliHelpViaCore()` und fehlende Core-basierte Helfer
- Systematisch 41 Dateien migrieren, die `$` oder `Bun.spawn` für CLI-Aufrufe nutzen:
  - Nach Befehlstyp batchen: create, edit, view, list, config, init
  - Business-Logik-Tests → Core API direkt
  Echte CLI-Contract-Tests (help text, TTY, init wizard, error messages) → bleiben als Subprocess, markiert mit `// CLI-CONTRACT: <reason>`

### Phase 2: cli.test.ts Split
- 1779-Zeilen-Monolith in fokussierte Dateien extrahieren (init, tasks, docs, decisions, config, agents)
- Bereits durch BACK-539 geplant — hier ausführen

### Phase 3: --parallel aktivieren
- `package.json` test script: `bun test --parallel --timeout=30000`
- `bun test` auf CI anpassen
- TUI termless tests (`term.spawn`) markieren als `--no-parallel` wenn nötig

## Complexity
**MITTEL** (1-2 Tage). Kein direkter Cherry-Pick. Der Approach ist bewährt (wir nutzen Core API bereits partiell). Die Hauptarbeit ist die systematische Migration von 245 Subprocess-Calls.

## Dependencies
- **BACK-539** (To Do) — Test Suite Audit, cli.test.ts Split
- **BACK-536** (To Do) — Test Isolation Fixes (Prerequisite!)
- **BACK-529** (Done) — Completion/Archive Semantik (betroffene Tests kennen)

## Estimated Savings
~290s → ~75s (4×, entsprechend Upstreams Ergebnis)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test suite runs in under 90s (down from ~290s)
- [ ] #2 No test assertions or business logic changed (mechanical migration only)
- [ ] #3 All existing tests pass under --parallel
- [ ] #4 Business logic tests use direct Core API calls
- [ ] #5 CLI-contract tests remain as subprocess calls, annotated with // CLI-CONTRACT
- [ ] #6 cli.test.ts split into focused files per command domain
- [ ] #7 getVersionSync() exists and is used in parallel-compatible tests
- [ ] #8 bunx tsc --noEmit passes, bun run check . passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Approved Implementation Plan

### Phase 0 — Prerequisites
1. Add `getVersionSync()` to `src/utils/version.ts` — sync read of package.json version field
2. Remove `process.chdir()` from `commands-test-helper.ts` & `commands-cov-helper.ts` — pass cwd via Core constructor instead
3. Fix `process.chdir()` in `runtime-cwd.test.ts`, `task-path.test.ts`, `readme.test.ts` — wrap in isolated scope

### Phase 1 — cli.test.ts Split
Split 1779-line monolith into domain files:
- `cli-init.test.ts` — init + git tests (lines 34-380)
- `cli-tasks.test.ts` — create/list/view/edit/shortcut (lines 383-1086)
- `cli-task-lifecycle.test.ts` — archive/state transitions (lines 1088-1328)
- `cli-docs.test.ts` — doc + decision commands (lines 1330-1484)
- `cli-board.test.ts` — board view/export (lines 1486-1779)

Each new file: convert subprocess calls to Core API where possible, mark CLI-CONTRACT tests. Add missing helpers to `test-helpers.ts` as needed.

### Phase 2 — $ → Core API Migration
Migrate ~37 files systematically. Extend `test-helpers.ts` with missing Core-based helpers. Priority: largest files first.

### Phase 3 — setTimeout Reduction
17 files, 49 calls. Replace polling with `retry()` pattern.

### Phase 4 — --parallel aktivieren
Update package.json, fix flaky tests, validate full suite.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->