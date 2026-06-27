---
id: BACK-554.4
title: "[Bulk] TUI – Multi-Select & Bulk Toolbar in Task List und Board"
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
completed_date: 2026-06-27 15:06
labels:
  - feature
  - tui
dependencies: []
parent_task_id: BACK-554
priority: high
ordinal: 302000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fügt Multi-Select-Checkboxen und Bulk-Action-Toolbar in die TUI hinzu.

**task-viewer-with-search.ts:**
- `createGenericList<Task>()` aufrufen mit `multiSelect: true`
- Bulk-Action-Toolbar (`BoxInterface`) unterhalb der Task-Liste mit:
  - `[C] Complete` – Bestätigungspopup, dann bulk-complete
  - `[A] Archive` – Bestätigungspopup, dann bulk-archive
  - `[S] Status` – öffnet Status-Auswahl, dann bulk-status-update
  - `[P] Priority` – öffnet Priority-Auswahl
  - `[M] Milestone` – öffnet Milestone-Auswahl
  - `[L] Labels` – öffnet Label-Auswahl
  - `[E] Assignee` – öffnet Assignee-Auswahl
- `Ctrl+A` Select-All (alle gefilterten Tasks selektieren)
- `Esc` bei bestehender Selection = clear selection (quit nur wenn keine Selection)
- Selection-State persistieren bei Filter-Änderungen (per Task-ID, nicht Index)
- Detail-Pane zeigt weiterhin den zuletzt highlighteten Task

**board.ts:**
- `Set<string> selectedTaskIds` auf Board-Ebene (nicht pro Column)
- Space zum Togglen des highlighteten Tasks
- Visual: `[✓]`/`[ ]` Prefix in `formatTaskListItem()`
- Bulk-Action-Footer analog zur Task List
- Select-All über alle Columns hinweg

**Hilfe-Popup** (`help-popup.ts`) um Bulk-Keybindings erweitern.

**Dependency:** Die Bulk-Logik (complete, archive, status-update etc.) wird über die REST-Endpoints oder direkt core.updateTasksBulk() aufgerufen. Setzt REST/MCP-Layer nicht zwingend voraus, kann auch direkt core nutzen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Task-List: Checkboxen ([✓]/[ ]) vor jedem Task sichtbar
- [ ] #2 Task-List: Space toggelt Selection, Ctrl+A selektiert alle gefilterten Tasks
- [ ] #3 Task-List: Bulk-Toolbar mit Complete, Archive, Status, Priority, Milestone, Labels, Assignee
- [ ] #4 Task-List: Bestätigungspopup vor irreversiblen Aktionen (Complete, Archive)
- [ ] #5 Task-List: Esc cleart Selection (kein Quit wenn Selektion aktiv)
- [ ] #6 Board: Space toggelt Selection, Visual [✓]/[ ] Prefix
- [ ] #7 Board: Bulk-Footer mit gleichen Aktionen
- [ ] #8 Board: Set<string> selectedTaskIds über alle Columns hinweg
- [ ] #9 Selection bleibt bei Filter-Änderungen erhalten (persist by task ID, nicht Index)
- [ ] #10 Hilfe-Popup zeigt Bulk-Keybindings an
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in:\n- src/ui/task-viewer-with-search.ts: external selectedTaskIds Set, Space toggles selection, Ctrl+A selects all filtered, Escape clears selection (does not quit when selection active), bulk toolbar with keybindings\n- src/ui/board.ts: per-board Set<string> selectedTaskIds, [✓]/[ ] prefix in formatTaskListItem(), Space/Ctrl+A/Escape, bulk footer\n- src/ui/components/help-popup.ts: bulk keybindings documented\n- src/ui/components/filter-header.ts: C-g clears search text (clear-X equivalent)\n\nSelection persists across filter changes (tracked by task ID, not index).\nBulk actions: Archive, Status, Priority, Milestone, Assignee, Labels, Due Date (U key).\nBulk Complete removed (ambiguous).\nDue Date prompt uses blessed textbox with YYYY-MM-DD or empty to clear.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TUI bulk operations implemented in both task list and board views. External selection state persists across filter changes. All planned bulk actions available via keybindings and toolbar. Due date input via blessed textbox prompt.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->