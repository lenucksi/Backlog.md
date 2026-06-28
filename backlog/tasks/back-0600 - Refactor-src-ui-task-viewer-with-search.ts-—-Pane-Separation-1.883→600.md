---
id: BACK-0600
title: Refactor src/ui/task-viewer-with-search.ts — Pane-Separation (1.883→600)
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
ordinal: 383000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Die Datei task-viewer-with-search.ts ist mit 1.883 Zeilen die zweitgrößte UI-Datei. Die Hauptfunktion viewTaskEnhanced ist eine God-Function die Task-Loading, Filter-UI, Task-Liste, Detail-Pane, Keybindings und Popup-Task-Erstellung in einer einzigen Funktion mischt.

Ziel: In sechs Module auftrennen — detail-content, viewer-state, list-pane, detail-pane, popup, keybindings. Die Hauptfunktion bleibt als Orchestrator (~600 Zeilen).

Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2b
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 6 Sub-Tasks erledigt
- [ ] #2 task-viewer-with-search.ts ≤ 700 Zeilen
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
- [ ] #5 TUI task-viewer funktioniert (manuell prüfen)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Extraktions-Reihenfolge (abnehmende Abhängigkeit):
1. src/ui/task-detail-content.ts — generateDetailContent, getPriorityDisplay, createMilestoneLabelResolver (pure functions, keine dependency)
2. src/ui/task-viewer-state.ts — state interface + focus/direction helpers
3. src/ui/task-list-pane.ts — TaskList blessed box creation, rendering, bulk selection
4. src/ui/task-detail-pane.ts — Detail pane rendering und scrolling
5. src/ui/task-popup.ts — createTaskPopup
6. src/ui/task-viewer-keybindings.ts — Alle screen.key() shortcuts
7. viewTaskEnhanced in main file auf 600 Zeilen reduzieren (nur noch Orchestrierung)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Die God-Function viewTaskEnhanced ist ~1.400 Zeilen lang. Die Extraktion muss von innen nach außen passieren: erst die puren Helper raus, dann die Rendering-Blöcke, dann die State-Verwaltung, zuletzt die Keybindings.

TUI-Komponenten haben oft subtile Interaktionen zwischen Panes — nach jedem Extract-Task manuell testen dass die TUI noch funktioniert.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->