---
id: BACK-0629
title: "Phase 4: Sequences + Overview + Restscreens"
status: To Do
assignee: []
created_date: 2026-07-05 21:32
updated_date: 2026-07-05 21:33
labels:
  - opentui
  - ui2
  - phase-4
milestone: m-20
dependencies: []
references:
  - doc-0054
priority: low
ordinal: 416000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ersetze die verbleibenden blessed-Screens:

1. **Sequence Viewer** (`sequences.ts`):
   - Vertikales Layout von Sequenzen
   - Move-Mode (Tasks zwischen Sequenzen verschieben)
   - Integration mit `core.sequences`

2. **Overview Dashboard** (`overview-tui.ts`):
   - 4-Panel-Statistiken (Status Overview, Priority, Recent Activity, Project Health)
   - Live-Updates via ContentStore-Watcher

3. **Create-Formulare** (task, milestone, draft, document):
   - Einheitliches Form-Layout mit Tab/S-Tab-Navigation
   - Validierung + Submit/Cancel
   - Integration mit `core.createTaskFromInput()`, `core.createDocumentFromInput()`, etc.

4. **Label Manager**:
   - CRUD-Interface als Modal
   - Integration mit `core.filesystem`

5. **Loading-Screen**:
   - Animated Spinner + Log-Bereich
   - Interruptierbar via Escape
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->