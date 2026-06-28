---
id: BACK-559
title: "subtasks: normale tasks sollen zu subtasks eines anderen konvertiert
  werden können (demotion + einrückung) und umgekehrt (promotion)"
status: To Do
assignee: []
created_date: 2026-06-16 12:32
updated_date: 2026-06-20 17:30
labels: []
milestone: m-10
dependencies:
  - BACK-560
references:
  - BACK-560
  - BACK-559.01 (Core)
  - BACK-559.02 (CLI+MCP)
  - BACK-559.03 (REST+Web UI)
  - BACK-559.04 (TUI)
priority: high
ordinal: 311000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normale (top-level) Tasks sollen zu Subtasks eines anderen Tasks konvertiert werden können (Demotion + Einrückung) und umgekehrt (Promotion).

**Demotion:** Task X wird Subtask von Task Y → `parentTaskId` von X auf Y setzen, ggf. ID ändern (dotted ID wie `task-5.3`), Datei umbenennen.
**Promotion:** Subtask X wird eigenständiger Top-Level-Task → `parentTaskId` löschen, neue Top-Level-ID vergeben, Datei umbenennen.
**Cascading:** Wenn ein Task mit eigenen Subtasks promoted/demoted wird, müssen alle Subtasks kaskadierend mitgezogen werden (deren `parentTaskId` und ggf. IDs müssen ebenfalls aktualisiert werden).

**Prerequisite:** BACK-560 muss zuerst implementiert sein, da Promotion/Demotion auf der `updateTaskFromInput`-Pipeline aufsetzt und `parentTaskId` im Update aktuell gedroppt wird.

Aufteilung in Subtasks nach Layer:
- BACK-559.1: Core-Logik (backlog.ts + file operations)
- BACK-559.2: CLI + MCP tools
- BACK-559.3: REST + Web UI
- BACK-559.4: TUI keybindings
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Task kann zu Subtask eines anderen Tasks demoted werden (parentTaskId setzen, ggf. ID-Umstellung)
- [ ] #2 Subtask kann zu Top-Level-Task promoted werden (parentTaskId löschen, neue ID)
- [ ] #3 Cascading: Subtask-Baum wird bei Promotion/Demotion korrekt mitgezogen
- [ ] #4 Datei wird bei ID-Änderung umbenannt (alte Datei gelöscht, neue erstellt)
- [ ] #5 Alle 5 Modalitäten unterstützen Promotion/Demotion: CLI, TUI, WebUI, MCP, REST
- [ ] #6 BACK-560 ist als Abhängigkeit markiert und muss vor Teilen von BACK-559 abgeschlossen sein
- [ ] #7 `bunx tsc --noEmit` passes
- [ ] #8 `bun test` passes
- [ ] #9 `bun run check .` passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Siehe Subtasks BACK-559.1 bis BACK-559.4 für detaillierte Layer-Pläne.

**Reihenfolge:**
1. BACK-560 (parentTaskId im Update fix) — prerequisite
2. BACK-559.1 (Core-Logik)
3. BACK-559.2 (CLI + MCP) — parallelisierbar mit 559.3
4. BACK-559.3 (REST + Web UI) — parallelisierbar mit 559.2
5. BACK-559.4 (TUI) — nach Core
<!-- SECTION:PLAN:END -->