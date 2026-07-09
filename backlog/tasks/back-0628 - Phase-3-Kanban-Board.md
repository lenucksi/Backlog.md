---
id: BACK-0628
title: "Phase 3: Kanban-Board"
status: To Do
assignee: []
created_date: 2026-07-05 21:32
updated_date: 2026-07-05 21:33
labels:
  - opentui
  - ui2
  - phase-3
milestone: m-20
dependencies: []
references:
  - doc-0054
priority: medium
ordinal: 415000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ersetze `src/ui/board.ts` (1735 Zeilen blessed) mit opentui/solid in `src/ui2/`.

Multi-Column Layout (Yoga Flexbox):
- Spalten pro Status, horizontal scrollbar via <ScrollBox>
- Task-Cards mit ID, Titel, Priority-Symbol, Assignee, Labels
- Farbige Status-Köpfe + Task-Counter

Move-Mode:
- m toggelt Move-Mode
- ←→ wechselt Zielspalte
- ↑↓ wechselt Zielposition
- Ghost-Preview (halbtransparente Box) an Zielposition
- Enter bestätigt Move → `core.reorderTask()`
- Escape bricht ab

Bulk-Select (wie Phase 2):
- Space toggelt Selektion
- C-a Select All / Deselect All
- Bulk-Aktionen: Archive, Status, Priority, Milestone, Assignee, Labels, DueDate

Inline Task-Detail-Popup (Enter auf Task):
- Zeigt Task-Detail im Modal
- Edit/Archive/Close Aktionen

Filter-Integration:
- Gleicher `<FilterBar>` wie Phase 2
- Filter schränkt sichtbare Tasks ein (kein Move bei aktiven Filtern)

Tests via testRender(): Move-Mode, Bulk-Select, Filter-Interaktion
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->