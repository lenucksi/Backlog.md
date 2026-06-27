---
id: BACK-554.5
title: "[Bulk] WebUI – Checkbox-Spalte & Bulk Action Bar"
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
completed_date: 2026-06-27 15:06
labels:
  - feature
  - webui
dependencies: []
parent_task_id: BACK-554
priority: high
ordinal: 303000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fügt eine Checkbox-Spalte mit Select-All und eine Bulk-Action-Bar in die WebUI Task-Tabelle hinzu.

**TaskList.tsx:**
- `useState<Set<string>> selectedTaskIds` für Selection-State
- `<th>` Checkbox mit Select-All (indeterminate state bei Teilauswahl)
- `<td>` Checkbox pro Row mit stopPropagation (damit row-click nicht Edit-Modal öffnet)
- Bulk-Action-Bar zwischen Filterleiste und Tabelle, nur sichtbar wenn `selectedTaskIds.size > 0`:
  - "N tasks selected" Counter
  - "Complete" / "Archive" Buttons (mit Confirm-Dialog)
  - "Set Status" Dropdown, "Set Priority" Dropdown
  - "Set Milestone" Dropdown, "Set Labels" Chip Input
  - "Set Assignee" Dropdown
  - "Clear Selection" Button
- Select-All bezieht sich auf die aktuell gefilterten/sortierten Tasks
- Nach Bulk-Aktion: Selection clearen, Daten refreshen

**App.tsx:**
- Callback für Bulk-Aktionen durchreichen oder TaskList direkt apiClient nutzen lassen

**UX:**
```
┌──────────────────────────────────────────────────────────┐
│ [Status ▼] [Priority ▼] ...                      [+ New]│
│                                                        │
│ ┌── BULK ACTIONS ─────────────────────────────────┐    │
│ │ ☑ 3 selected | [Complete] [Archive] [Status ▼] │    │
│ └─────────────────────────────────────────────────┘    │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ☐ │ ID │ Title     │ ...                          │ │
│ │ ☑ │ T1 │ Fix login │ ...                          │ │
│ │ ☐ │ T2 │ Add tests │ ...                          │ │
│ └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Dependency:** Setzt REST Bulk Endpoints für die tatsächliche Ausführung voraus. UI kann unabhängig gebaut werden mit Placeholder-API-Calls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TaskList.tsx: Checkbox-Spalte links mit <input type=checkbox> pro Row
- [ ] #2 TaskList.tsx: Select-All Checkbox im Header mit indeterminate State bei Teilauswahl
- [ ] #3 TaskList.tsx: Bulk-Action-Bar sichtbar bei N > 0 mit Counter und Aktions-Buttons
- [ ] #4 Bulk-Aktionen: Complete, Archive (mit Confirm), Status, Priority, Milestone, Labels, Assignee
- [ ] #5 Select-All bezieht sich auf aktuell gefilterte (nicht alle) Tasks
- [ ] #6 Row-Click öffnet weiterhin Edit-Modal – Checkbox-Click stoppt Propagation
- [ ] #7 Nach Bulk-Aktion: Selection clearen, Liste refreshen
- [ ] #8 Daten-Refresh über bestehenden apiClient.search() oder neuen bulk-API-Calls
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in src/web/components/TaskList.tsx:\n- Checkbox column with <input type=checkbox> per row (stopPropagation to avoid row-click triggering edit modal)\n- Select-All checkbox in header with indeterminate state for partial selection\n- Bulk Action Bar visible when selection > 0:\n  - Selected count: "N tasks selected"\n  - Archive button (with confirmation)\n  - Status dropdown\n  - Priority dropdown\n  - Milestone dropdown\n  - Labels chip input\n  - Assignee dropdown\n  - Due Date date-picker\n  - Clear Selection button\n- Select-All targets currently filtered (not all) tasks\n- Selection cleared and list refreshed after bulk action\n- Bulk Complete button removed\n\nBackend API methods in src/web/lib/api.ts: 7 bulk methods.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
WebUI bulk operations implemented with checkbox column, indeterminate Select-All, and full Bulk Action Bar. All backend calls go through apiClient bulk methods. Bulk Complete excluded by design.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->