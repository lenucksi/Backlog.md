---
id: BACK-484.1
title: BACK-484.1 — Parent Task Autocomplete WebUI
status: Done
assignee: []
created_date: 2026-06-08 17:30
updated_date: 2026-06-08 17:42
labels: []
dependencies: []
modified_files:
  - src/web/components/ChipInput.tsx
  - src/web/components/TaskDetailsModal.tsx
parent_task_id: BACK-484
priority: medium
ordinal: 259000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Implementation

Replace the plain `<input>` for parentTaskId in TaskDetailsModal with ChipInput singleSelect mode.

### Dependencies
- BACK-484 (Phase 1: ChipInput singleSelect mode)

### Änderungen

1. **src/web/components/ChipInput.tsx** — Add `singleSelect?: boolean` prop:
   - When true, shows at most one chip
   - Selecting a suggestion sets the value directly (no multi-add)
   - Clearing the chip (X button) resets to empty
   - Enter on input selects first suggestion if available

2. **src/web/components/TaskDetailsModal.tsx** — Replace parent task `<input>`:
   - Build `parentTaskSuggestions` from availableTasks (format: `"BACK-123 - Task Title"`)
   - `ChipInput name="parentTaskId" singleSelect suggestions={parentTaskSuggestions}`
   - Extract task ID from selected suggestion on change
   - Keep existing onBlur save logic for backward compat

### Modified Files
- src/web/components/ChipInput.tsx
- src/web/components/TaskDetailsModal.tsx
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation

Parent-Task-Eingabefeld in TaskDetailsModal wurde von plain `<input>` auf ChipInput singleSelect umgestellt.

### Änderungen
- **src/web/components/ChipInput.tsx**: `singleSelect`-Prop implementiert (siehe BACK-484 Phase 1)
- **src/web/components/TaskDetailsModal.tsx**: 
  - `parentTaskSuggestions` useMemo (availableTasks → "BACK-123 - Task Title")
  - ChipInput singleSelect mit suggestions übergeben
  - onChange extrahiert taskId aus erstem Teil vor " - "
  - onChange speichert via handleInlineMetaUpdate

Bemerkung: Die ChipInput singleSelect-Logik wurde in BACK-484 implementiert. BACK-484.1 ist der Consumer davon und hat keine eigene ChipInput-Änderung.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Parent-Task-Feld in WebUI von plain input auf ChipInput singleSelect mit Task-Autocomplete umgestellt.
<!-- SECTION:FINAL_SUMMARY:END -->