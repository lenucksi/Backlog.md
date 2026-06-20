---
id: BACK-570
title: Multi-Select Filter Dropdowns + Active Filter Chips in WebUI
status: Archived
assignee:
  - "@jo"
created_date: 2026-06-17 13:25
updated_date: 2026-06-17 13:39
labels:
  - web-ui
  - ux
dependencies: []
priority: high
ordinal: 317000
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace native <select> filters in Kanban board and All Tasks view with Multi-Select Dropdowns. Add a filter chips row showing all active filters with remove buttons.

- Kanban: Priority filter → Multi-Select
- All Tasks: Status, Priority, Milestone filters → Multi-Select
- NEW: FilterChips component showing active filters (e.g. `label:bug ×`, `assignee:jo ×`, `priority:high ×`, `status:In Progress ×`)
- Generalize LabelFilterDropdown → MultiSelectDropdown (keep old export as alias)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->



## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kanban board priority filter is multi-select dropwdown (not single select)
- [x] #2 All Tasks status/priority/milestone filters are multi-select dropdowns
- [x] #3 Filter chips row visible below filter bar when any filter is active
- [x] #4 Each chip has × button that removes only that specific filter value
- [x] #5 URL params round-trip correctly for multi-select (searchParams.getAll / params.append)
- [x] #6 FilterFhips component shows label colors for label filter chips
- [x] #7 Backward compatible: LabelFilterDropdown still exported from same module
<!-- AC:END -->



## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

### LabelFilterDropdown → MultiSelectDropdown
The existing `LabelFilterDropdown` in `src/web/components/LabelFilterDropdown.tsx` was already mostly generic — it took `availableLabels`/`selectedLabels` as `string[]`, had optional `labelColors`, `singleSelect`, and `title`. The only label-specific thing was the prop name `labelColors` and the column description in the menu.

Renamed the implementation component to `MultiSelectDropdown` with props `options`, `selected`, `onChange`, `menuId`, `className`, `itemColors`, `singleSelect`, `title`. The old `LabelFilterDropdown` component is now a thin wrapper that maps `availableLabels`→`options`, `selectedLabels`→`selected`, `labelColors`→`itemColors`.

Old imports (`import LabelFilterDropdown from ...`) continue to work unchanged. New code can import `{ MultiSelectDropdown }` for generic use.

### Filter state transition
**Before (single string):**
```
const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "");
// or
const filterPriority = searchParams.get("priority") ?? '';
hasActiveFilters: statusFilter !== ''
API call: status: statusFilter || undefined
filter logic: if (filterPriority) { result.filter(task => task.priority === filterPriority) }
```

**After (array):**
```
const [statusFilter, setStatusFilter] = useState<string[]>(() => searchParams.getAll("status"));
// or
const filterPriority = searchParams.getAll('priority');
hasActiveFilters: statusFilter.length > 0
API call: status: statusFilter.length > 0 ? statusFilter : undefined
filter logic: if (filterPriority.length > 0) { result.filter(task => task.priority && filterPriority.includes(task.priority)) }
```

### URL parameter format
Multi-select values are stored as multiple URL params with the same key:
- `?status=To%20Do&status=In%20Progress`
- `?priority=high&priority=medium`
- `?milestone=m-5&milestone=m-12`

This uses React Router's `URLSearchParams.append()` / `searchParams.getAll()` pattern which is built-in and well-supported. BoardPage and TaskList both use `params.delete("key")` + `params.append("key", value)` on write, and `searchParams.getAll("key")` on read.

### Backend compatibility
The `apiClient.search()` method already accepts `status?: string | string[]` and `priority?: SearchPriorityFilter | SearchPriorityFilter[]`. The server handler uses `url.searchParams.getAll("status")` and `url.searchParams.getAll("priority")`. No backend changes needed.

### Milestone filter quirks
The special `__none` value ("no milestone") is handled correctly: it's one of the MultiSelectDropdown options, and the `filterByMilestone` function checks `selectedMilestones.has("__none")` and matches tasks with empty/null milestone values. The chip label for `__none` shows "No milestone" instead of "Milestone: __none".
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replace native `<select>` filter dropdowns with multi-select dropdowns in Kanban board and All Tasks view. Add a filter chips row showing all active filters with individual remove buttons.

## Changes

### MultiSelectDropdown (generalized LabelFilterDropdown)
- `src/web/components/LabelFilterDropdown.tsx`: Renamed internal component to `MultiSelectDropdown` with generic prop names (`options`, `selected`, `itemColors`). Kept `LabelFilterDropdown` as a backward-compatible wrapper/export. No breakage.

### FilterChips component (NEW)
- `src/web/components/FilterChips.tsx`: New component — renders a `flex flex-wrap` row of removable pill-shaped chips. Each chip shows a label, optional color dot, and × button. Accepts `chips: { key, label, color?, onRemove }[]`.

### Kanban Board (Board.tsx + BoardPage.tsx)
- `filterPriority` prop type changed from `string` → `string[]`
- `onFiltersChange` callback updated to accept `priority: string[]`
- Priority `<select>` replaced with `<MultiSelectDropdown>` (options: high/medium/low)
- Filter logic updated: `filterPriority.length > 0` / `filterPriority.includes(task.priority)`
- Active filter chips row shown below the header: assignee, labels (with colors), priorities
- BoardPage.tsx: URL params use `searchParams.getAll("priority")` + `params.append("priority", p)` for array round-trip

### All Tasks (TaskList.tsx)
- `statusFilter`, `priorityFilter`, `milestoneFilter` all changed from `string` to `string[]`
- 3 native `<select>` replaced with `<MultiSelectDropdown>`:
  - Status: options from `availableStatuses`
  - Priority: options from `PRIORITY_OPTIONS` (["high", "medium", "low"])
  - Milestone: options from `["__none", ...milestoneOptions]`
- `syncUrl()` updated to append arrays via `params.append()`
- `isTerminalStatus` checks `statusFilter.some()` instead of single string
- `filterByMilestone` checks against a `Set` of selected values
- API calls pass arrays for status/priority
- Filter chips row shows all active filters with individual × buttons (status, priority, milestone, assignee, labels)
- URL params sync correctly: `?status=To%20Do&status=In%20Progress`

### Test fixes
- Updated `web-task-list-labels-menu.test.tsx`: replaced `getSelectByFirstOption`/`setSelectValue` with `selectMultiSelectOption` helper that clicks dropdown buttons. Updated "Clear label filter" → "Clear labels filter".
<!-- SECTION:FINAL_SUMMARY:END -->