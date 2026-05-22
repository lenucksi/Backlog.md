---
id: BACK-527.4
title: 'Phase 5: TUI Coverage ≥50% via termless/vterm.js + mock.module'
status: Done
assignee: []
created_date: '2026-05-22 13:28'
updated_date: '2026-05-22 15:00'
labels:
  - testing
  - coverage
  - phase-5
  - tui
  - termless
dependencies: []
parent_task_id: BACK-527
priority: high
ordinal: 238000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coverage für TUI-Files auf ≥50% bringen. Kombiniert termless/vterm.js (blessed TUI Board rendert jetzt korrekt via DA1/DA2 Interception) mit bestehenden mock.module Patterns.

## Termless für blessed TUI — läuft! 🎉

Seit BACK-526/vterm-backend.ts funktioniert blessed TUI in termless:
- DA1/DA2/DSR Queries werden in `feed()` abgefangen
- Responses werden via `onResponse` zurück durch die PTY gesendet
- Board rendert korrekt (Alt-Screen, Filter, Kanban-Spalten)
- Cell-Level Assertions funktionieren
- Siehe `tui-termless-core.test.ts` für Beispiele

```typescript
const t = term(120, 40);
await t.spawn(["bun", cliPath, "board"], { cwd: testDir, env: { NO_COLOR: "1" } });
await t.waitFor("To Do", 10000);
expect(t.getMode("altScreen")).toBe(true);
t.press("q");
await t.close();
```

## Files

1. **src/ui/board.ts** (aktuell ~34% Coverage) — Erweitere board-coverage.test.ts:
   - Keyboard-Navigation (Pfeiltasten zwischen Spalten)
   - Filter-Interface (Priority, Milestone, Labels)
   - Milestone-Swimlanes (toggle, navigation)
   - Quit/Save keybindings
   - Search-Modus
   - Nutze `mock.module` + optional termless für E2E

2. **src/ui/task-viewer-with-search.ts** (aktuell ~24%) — Erweitere task-viewer-coverage.test.ts:
   - Viewer-Keybindings (Navigation, Search-Exit)
   - Search-Fokus-Wechsel
   - Detail-Pane Boundaries
   - CreateTaskPopup edge cases
   - Nutze `mock.module` + termless

3. **src/ui/ui-components/** (help-popup, filter-header, confirm-popup, generic-list):
   - Neue Tests für ungetestete Komponenten
   - Nutze `createScreen({ smartCSR: false })` + TTY-Patch Pattern

## Drei Test-Ebenen für TUI

| Ebene | Methode | Für | Referenz |
|---|---|---|---|
| 1. Pure Logic | `describe`/`it` — Formatierer, Filter-Logik | `formatTaskListItem`, `shouldRebuildColumns` | `board-ui.test.ts` |
| 2. Widgets (mock) | `mock.module("neo-neo-bblessed")` | Key-Handler, Widget-Interaktion | `board-coverage.test.ts` |
| 3. E2E (termless) | `term.spawn()` + `term.press()` + `term.waitFor()` | Ganzer Board-Flow | `tui-termless-core.test.ts` |

## Referenzen
- doc-7: Terminal Test Strategie
- doc-8: Termless Analysis Report
- src/test/vterm-backend.ts: TerminalBackend Adapter (DA1/DA2/DSR Interception)
- src/test/termless-helper.ts: Convenience Wrapper
- src/test/tui-termless-core.test.ts: Beispiel: blessed Board via termless
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
