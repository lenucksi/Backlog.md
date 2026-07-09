---
id: BACK-0626
title: "Phase 1: UI2 Infrastruktur — Modal, Button, SelectableList, FilterBar"
status: To Do
assignee: []
created_date: 2026-07-05 21:32
updated_date: 2026-07-05 21:33
labels:
  - opentui
  - ui2
  - phase-1
milestone: m-20
dependencies: []
references:
  - doc-0054
priority: high
ordinal: 413000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Baue die 4 fundamentalen UI-Komponenten für die neue opentui-basierte TUI in `src/ui2/`. Jede Komponente bekommt eigene Tests via `testRender()`.

1. **Modal-System** — Backdrop, Focus-Trap, Escape-Close, Promise-basierte API (`openModal()` / `openConfirm()`)
2. **Button** — `<Button>` mit `variant` (primary/default/destructive), `onClick`, Focus-Indikator, Hover
3. **SelectableList** — Suche, Multi-Select via Space, Keyboard-Navigation (j/k, g/G), `onBoundaryNavigation`, `onSelect`
4. **FilterBar** — Dynamische Button-Leiste + Search-Input + integrierte Promise-basierte Filter-Popups

Alle 4 Komponenten sind general-purpose und später upstream-fähig. Sie ersetzen die blessed-Komponenten aus `src/ui/components/`.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->