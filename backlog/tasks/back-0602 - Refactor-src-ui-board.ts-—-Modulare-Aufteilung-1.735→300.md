---
id: BACK-0602
title: Refactor src/ui/board.ts — Modulare Aufteilung (1.735→300)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-07-05 19:57
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

Ziel: In 8 Module aufteilen — helpers, column, move-mode, state, keybindings, editor, footer, bulk. board.ts wird zur schmalen Facade (~300 Zeilen).

Subtasks:
- 0602.01 board-helpers.ts — buildColumnTasks, formatTaskListItem (pure helpers)
- 0602.02 board-column.ts — ColumnView management
- 0602.03 board-move-mode.ts — MoveOperation, drag-drop
- 0602.04 board-editor.ts — openTaskEditor (ID mit ordinal vertauscht)
- 0602.05 board-state.ts — state + selection (ID mit ordinal vertauscht)
- 0602.06 board-footer.ts — footer management
- 0602.07 board-bulk.ts — bulk operations
- 0602.08 board-keybindings.ts — alle screen.key() shortcuts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 8 Subtasks (0602.01-.08) erledigt
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