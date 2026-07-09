---
id: BACK-0600
title: Refactor src/ui/task-viewer-with-search.ts — Pane-Separation (1.883→600)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-07-07 12:35
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
Die Datei task-viewer-with-search.ts ist mit 1.883 Zeilen die zweitgrößte UI-Datei. Die Hauptfunktion viewTaskEnhanced ist eine God-Function mit 11 Verantwortlichkeiten und 25 mutable let-Variablen.

Ziel: In sechs Module auftrennen — detail-content, popup, viewer-state, list-pane, detail-pane, keybindings. Die Hauptfunktion wird zum Orchestrator (~600 Zeilen).

Drei Subtasks nach Extraktionsreihenfolge (steigendes Risiko):
1. **0600.01** — pure functions: detail-content (generateDetailContent + helpers) + createTaskPopup → neue Module, keine blessed-Abhängigkeit
2. **0600.02** — state + debt: ViewerState Interface, Layout-Konstanten, tech-debt Fixes (isPast in detail-content, header-height dedup, guard dedup in keybindings, cleanup-Triade vereinheitlichen)
3. **0600.03** — panes + shrink: list-pane + detail-pane + keybindings extrahieren, main auf 600 Zeilen

Tech-Debt-Strategie: Nur das mitnehmen was die Zerlegung blockiert oder beim Umbau eh getroffen wird. Rest (executeBulkUpdate Strategy-Pattern, Metadata-Helper, openFilterPicker dedup) in separate Tasks.
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
Extraktions-Reihenfolge (steigendes Risiko):
1. **0600.01** — pure Extraktionen: detail-content (177 Zeilen) + popup (140 Zeilen). Keine state-Abhängigkeit.
2. **0600.02** — State formalisieren + tech-debt Fixes: ViewerState Interface, LAYOUT Constants, isPast-Parameter, header-height Dedup, Guard-Helper, cleanup()-Helper.
3. **0600.03** — Pane-Extraktion + Shrink: list-pane (~300 Zeilen) + detail-pane (~200 Zeilen) + keybindings (~200 Zeilen). Main von 1398→~600.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2b. Code-Smell-Analyse mit context-hunter + code-smells Skills erstellt: F90k-K_25-Kopplung, 10× Guard-Duplikation, 4× Cleanup-Triade, 16× Metadata-Formatierung, 7× if-Kette executeBulkUpdate.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->