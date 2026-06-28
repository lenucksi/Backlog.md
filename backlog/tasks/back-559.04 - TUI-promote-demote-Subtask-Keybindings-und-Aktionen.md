---
id: BACK-559.04
title: "TUI: promote/demote Subtask Keybindings und Aktionen"
status: To Do
assignee: []
created_date: 2026-06-20 17:30
labels: []
milestone: m-10
dependencies:
  - BACK-559.01
modified_files:
  - src/ui/task-viewer-with-search.ts
  - src/ui/board.ts
parent_task_id: BACK-559
priority: low
ordinal: 324000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TUI-Keybindings und Aktionen für Subtask Promotion/Demotion.

**TUI (`src/ui/`):**
- Task-Viewer mit Such-Funktion (`src/ui/task-viewer-with-search.ts`): Keybinding für promote/demote in der Task-Detail-Ansicht
- Board-Ansicht (`src/ui/board.ts`): Keybinding oder Action für promote/demote
- Pattern: An vorhandene Aktionen wie "archive", "complete", "move to sequence" anlehnen

**Mögliche Keybindings:**
- `p` — Promote Subtask to Task (wenn current task ein Subtask ist)
- `d` — Demote Task to Subtask (öffnet Parent-Auswahl)
- Oder via Command-Palette (falls vorhanden)

**Interaktion:**
- Bei Demotion: Parent-Task-ID via Input-Dialog abfragen
- Bei Promotion: Bestätigungsdialog (Sicherheitsabfrage)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TUI Task-Detail-Ansicht hat Keybinding für "Promote to Task" (nur bei Subtasks)
- [ ] #2 TUI Task-Detail-Ansicht hat Keybinding für "Demote to Subtask" (nur bei Top-Level-Tasks)
- [ ] #3 Demotion fragt Parent-Task-ID via Input-Dialog ab
- [ ] #4 Promotion hat Bestätigungsdialog
- [ ] #5 Fehlerbehandlung: Task nicht gefunden, zirkuläre Hierarchie
- [ ] #6 `bunx tsc --noEmit` passes
- [ ] #7 `bun run check .` passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->