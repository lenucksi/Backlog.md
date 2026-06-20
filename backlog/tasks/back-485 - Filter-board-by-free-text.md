---
id: BACK-485
title: Filter board by free text
status: Done
assignee:
  - "@jo"
created_date: 2026-05-13 10:11
updated_date: 2026-06-20 18:02
labels: []
milestone: m-8
dependencies: []
modified_files:
  - src/web/components/Board.tsx
  - src/web/components/BoardPage.tsx
  - src/web/components/TaskList.tsx
priority: medium
ordinal: 172000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The kanban board view should have another filter that is freetext across all issue titles.
the all tasks view needs that too.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Board view has a free-text search input that filters by title/ID
- [x] #2 All Tasks view has a free-text search input that filters by title/ID
- [x] #3 Search query is reflected in URL as ?q= parameter
- [x] #4 Clear filters resets the search query
- [x] #5 Search is case-insensitive substring match on title and task ID
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation Notes:
- Board.tsx: filterQuery prop, local case-insensitive substring match on task.title + task.id in filteredTasks useMemo
- BoardPage.tsx: read/write ?q= URL param, pass to Board
- TaskList.tsx: filterQuery state, sync via ?q= URL param, pass to apiClient.search()
- Uses existing Fuse.js-backed SearchService on the backend for the TaskList
- Board filtering stays in-memory (no API call) for consistency with existing assignee/label/priority filters
- Search input styled consistent with other filter controls: border, bg, dark mode, focus ring
- URL param pattern: ?q=search+term (consistent with TUI and CLI search conventions)
- Polish: moved search input from left side to right side in All Tasks (matching Board layout)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added free-text search to both WebUI Kanban Board and All Tasks views. The Board uses local case-insensitive substring filtering on title and ID (in-memory, matches existing filter pattern). The All Tasks view passes the query to the API search endpoint (apiClient.search() with query param) which already supports ?query= via SearchService/Fuse.js. URL param: ?q=. Both views show a search input with magnifying glass icon, display a removable "Search: ..." chip in FilterChips, and the Clear filters button resets the query.
<!-- SECTION:FINAL_SUMMARY:END -->