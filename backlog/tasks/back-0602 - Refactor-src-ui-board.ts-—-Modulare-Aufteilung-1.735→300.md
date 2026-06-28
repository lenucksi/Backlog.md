---
id: BACK-0602
title: Refactor src/ui/board.ts — Modulare Aufteilung (1.735→300)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - refactoring
  - tech-debt
  - large-file
  - tui
milestone: m-15
dependencies: []
priority: high
ordinal: 385000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
board.ts ist die Kanban-Board-TUI-Komponente mit 1.735 Zeilen. renderBoardTui ist eine God-Function die Column-Rendering, Move-Mode, Filter-Integration, Bulk-Operationen, Keybindings und Editor-Integration in einer Funktion mischt.

Ziel: In 8 Module aufteilen — helpers, column, move-mode, state, keybindings, editor, footer, bulk.

Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2d
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 8 Sub-Tasks erledigt
- [ ] #2 board.ts ≤ 400 Zeilen
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
- [ ] #5 TUI board funktioniert (manuell prüfen)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Extraktions-Reihenfolge:
1. src/ui/board-helpers.ts — buildColumnTasks, prepareBoardColumns, formatTaskListItem, formatColumnLabel
2. src/ui/board-column.ts — ColumnView management, createColumnViews, setColumnActiveState
3. src/ui/board-move-mode.ts — MoveOperation, getProjectedColumns, performTaskMove
4. src/ui/board-state.ts — State initialization, selection management, renderView decisions
5. src/ui/board-editor.ts — openTaskEditor, setupContentAreaHandlers
6. src/ui/board-footer.ts — Footer management, updateFooter, showTransientFooter
7. src/ui/board-bulk.ts — Bulk operations (archive, status, priority ändern)
8. src/ui/board-keybindings.ts — Alle screen.key() handlers (~400 Zeilen!)
9. renderBoardTui in main file auf 400 Zeilen reduzieren
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
board.ts ähnelt task-viewer-with-search.ts strukturell. Die Keybindings sind der größte Block (~400 Zeilen) und sollten als erstes extrahiert werden weil sie am wenigsten mit dem Rest verwoben sind.

Move-Mode hat viel State (selectedTask, projectedColumns) — sauberes Interface definieren BEVOR extrahiert wird.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->