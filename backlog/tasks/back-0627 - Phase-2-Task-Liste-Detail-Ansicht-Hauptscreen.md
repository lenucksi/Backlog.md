---
id: BACK-0627
title: "Phase 2: Task-Liste + Detail-Ansicht (Hauptscreen)"
status: To Do
assignee: []
created_date: 2026-07-05 21:32
updated_date: 2026-07-05 21:33
labels:
  - opentui
  - ui2
  - phase-2
milestone: m-20
dependencies: []
references:
  - doc-0054
priority: high
ordinal: 414000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ersetze `src/ui/task-viewer-with-search.ts` (1883 Zeilen blessed) mit opentui/solid-Komponenten in `src/ui2/`.

Split-Pane:
- Links: `<SelectableList>` mit Tasks, gruppiert nach Status
- Rechts: `<TaskDetail>` (existiert bereits aus PoC in src/tui2/)
- Oben: `<FilterBar>` mit Status/Priority/Milestone/Labels-Filtern
- Unten: Footer mit Key-Hints + transienten Nachrichten

Keyboard-Shortcuts:
- j/k ↑↓ Navigation in der Liste
- h/l ←→ zwischen Liste und Detail wechseln
- / oder C-f Search-Fokus
- s/p/l/i Filter-Popups
- e Task editieren ($EDITOR via core.editTaskInTui)
- c/a Task archivieren
- y Task-ID in Clipboard
- Space Multi-Select
- C-a Select All
- ? Help-Popup
- Tab Switch to Kanban-Board
- q/C-c/Escape Exit (gestaffelt: Filter → Selection → Quit)

Tests via testRender() für jede Interaktion.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->