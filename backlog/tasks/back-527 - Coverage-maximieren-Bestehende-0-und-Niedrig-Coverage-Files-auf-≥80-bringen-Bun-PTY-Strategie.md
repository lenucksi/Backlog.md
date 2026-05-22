---
id: BACK-527
title: >-
  Coverage maximieren: Bestehende 0%- und Niedrig-Coverage-Files auf ≥80%
  bringen (Bun PTY Strategie)
status: To Do
assignee: []
created_date: '2026-05-22 12:05'
updated_date: '2026-05-22 12:47'
labels:
  - testing
  - coverage
  - tui
  - bun-pty
  - core
dependencies: []
references:
  - >-
    doc-7 - Terminal-Test-Strategie: Bun Native PTY statt @termless/* oder
    expect-TCL
priority: high
ordinal: 233000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aktuelle Coverage: ~48% (Einzelfile core.test.ts) / geschätzt 65-75% (alle ~170 Testfiles). Ziel: 85%+ für Non-TUI-Code, 50%+ für TUI-Code.

Strategie: 5 Phasen, jede Phase baut auf der vorherigen auf. Nutzt die in BACK-526 etablierte Bun Native PTY Methode (Dokument doc-7) und die bestehenden mock.module("neo-neo-bblessed") Patterns.

## Phase 1 — 0%-Files abdecken (low-hanging fruit, rein funktional)

Kleine Utility-Files ohne TUI-Abhängigkeiten, rein funktionale Tests:
- src/utils/task-updated-date.ts (0%, 39 lines) — Datums-Updatelogik
- src/utils/terminal-status.ts (0%, ~23 lines) — Terminal-Status-Logik
- src/utils/input-sanitizer.ts (0%, ~16 lines) — Input-Bereinigung
- src/utils/task-subtasks.ts (0%, ~36 lines) — Subtask-Helper
- src/utils/editor.ts (0%, ~96 lines) — Editor-Konfiguration
- src/core/reorder.ts (0%, 94 lines) — Reorder-Algorithmen
- src/core/prefix-migration.ts (7%, ~99 lines) — Prefix-Migration

Jedes File bekommt einen eigenen Test (`*-coverage.test.ts` oder passende existierende Test-Datei).

## Phase 2 — Core Services (Integration-Tests)

Files mit komplexerer Logik und vielen Verzweigungen:
- src/core/search-service.ts (8%, 446 lines) — Volltext-Suche
- src/core/task-loader.ts (11%, ~700 lines) — Task-Loading + Branching
- src/core/content-store.ts (18%, ~900 lines) — Content-Caching
- src/core/sequences.ts (3%, ~280 lines) — Sequence-Logik
- src/core/backlog.ts (~50%, 2789 lines) — Core-Hauptdatei (Testausbau)

Hauptsächlich direkte Core-API-Aufrufe via `const core = new Core(testDir)` + `await core.method()` Muster.

## Phase 3 — Commands via Bun PTY

Große Command-Dateien, die CLI-Parsing + Interaktion testen:
- src/commands/task.ts (1028 lines) — Task CRUD + alle Subcommands
- src/commands/init.ts (971 lines) — Projekt-Initialisierung
- src/commands/config.ts (416 lines) — Config get/set
- src/commands/board.ts (TUI) — Board-Command (PTY nötig)

Nutzt Bun PTY Pattern aus BACK-526: `Bun.spawn([...], { terminal: {...} })` + `proc.terminal.write(data)`.

## Phase 4 — MCP + Server (HTTP/JSON)

Server-seitige Tests ohne TUI:
- src/mcp/server.ts (533 lines)
- src/mcp/tools/tasks/handlers.ts (442 lines)
- src/server/handlers/tasks.ts (417 lines)
- src/mcp/tools/milestones/handlers.ts (533 lines)
- src/server/index.ts (321 lines)

Nutzt existierende Server-Test-Patterns (starte Server auf random port, sende HTTP-Requests).

## Phase 5 — TUI Coverage erhöhen via Bun PTY

Bestehende coverage-test Dateien erweitern:
- src/test/board-coverage.test.ts (aktuell 34% für board.ts) — Keyboard-Navigation, Filter, Milestone-Swimlanes
- src/test/task-viewer-coverage.test.ts (aktuell 24%) — Viewer-Keybindings, Search-Exit-Wrapping
- src/test/ui/* — Neue Tests für generische UI-Komponenten (help-popup, filter-header, confirm-popup)

Nutzt `mock.module("neo-neo-bblessed")` + Bun PTY für echte E2E-Szenarien.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Phase 1: Alle 0%-Utility-Files haben ≥80% Line Coverage
- [ ] #2 Phase 2: Core-Services (search-service, task-loader, content-store, sequences) haben ≥80% Line Coverage
- [ ] #3 Phase 3: Commands (task, init, config) haben ≥70% Line Coverage
- [ ] #4 Phase 4: MCP + Server haben ≥80% Line Coverage
- [ ] #5 Phase 5: TUI-Files (board, task-viewer, sequences) haben ≥50% Line Coverage
- [ ] #6 Globale Coverage-Schwelle in CI von 50% auf 65% erhöht (nach Phase 1+2)
- [ ] #7 Threshold nach Phase 3+4 auf 75%, nach Phase 5 auf 80%
- [ ] #8 Kein CI-Regression — alle bestehenden Tests bleiben grün
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Testing Methodik

### Basis-Infrastruktur (BACK-526)
- Bun native PTY für blessed TUI Tests (`Bun.spawn` + `terminal`-Option)
- vterm.js Backend (src/test/vterm-backend.ts) für Cell-Level CLI Tests
- termless-helper.ts (src/test/termless-helper.ts) als Convenience-Wrapper
- termlessMatchers via `expect.extend()` für bun:test kompatibel

### Drei Test-Ebenen

| Ebene | Methode | Für | Beispiel-File |
|---|---|---|---|
| 1. Unit (Pure Functions) | Direkter Import, `describe`/`it` | Utilities, Helper, Parser | `src/utils/task-updated-date.ts` → `src/test/task-updated-date.test.ts` |
| 2. Integration (Core API) | `const core = new Core(testDir)` + `await core.method()` | backlog.ts, task-loader, search-service | Bestehende Muster in `core.test.ts` |
| 3. CLI/E2E (termless + vterm.js) | `term.spawn(...)` + `term.waitFor(...)` + `term.screen` | Commands, MCP, Server | `tui-interactive-editor-handoff.test.ts` |

### Coverage-Ziele pro Phase
- Phase 1: ≥80% für Utility-Files (schnell, rein funktional)
- Phase 2: ≥80% für Core Services
- Phase 3: ≥70% für Commands (via termless spawn)
- Phase 4: ≥80% für MCP + Server
- Phase 5: ≥50% für TUI-Files

### Referenzen
- vterm-backend.ts: TerminalBackend Adapter für vterm.js
- termless-helper.ts: Convenience Wrapper
- doc-8: Termless Analysis Report
- doc-7: Terminal-Test-Strategie
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Alle bunx tsc --noEmit pass (bei TS-Änderungen)
- [ ] #5 Alle bun run check . pass (bei Format/Lint-Änderungen)
- [ ] #6 bun test (or scoped) passes
<!-- DOD:END -->
