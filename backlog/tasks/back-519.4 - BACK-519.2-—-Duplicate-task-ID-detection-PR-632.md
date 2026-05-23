---
id: BACK-519.4
title: 'BACK-519.2 — Duplicate task ID detection (PR #632)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 16:48'
labels:
  - upstream
  - feature
  - quality
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/632'
modified_files:
  - src/utils/duplicate-detection.ts
  - src/server/handlers/system.ts
  - src/server/router.ts
  - src/mcp/tools/tasks/handlers.ts
  - src/ui/unified-view.ts
  - src/web/components/DuplicateIdWarning.tsx
  - src/web/components/Layout.tsx
  - src/web/lib/api.ts
  - src/test/duplicate-detection.test.ts
parent_task_id: BACK-519
priority: medium
ordinal: 221000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Add proactive duplicate task ID detection across all modalities. PR #632 by brooksc adds a utility, MCP warning, TUI warning, and WebUI banner.

## Key changes
- New `src/utils/duplicate-detection.ts` utility
- MCP: prepend duplicate warning to `task_list` output
- TUI: startup warning in board/unified-view
- WebUI: banner + `/api/duplicates` endpoint + DuplicateIdWarning component
- 9 existing tests

## Server adaptation needed
Current server uses handler modules + typed RouteHandlers. Need new handler in `src/server/handlers/system.ts` registered in RouteHandlers.

## Implementation plan
1. Port duplicate-detection.ts utility (directly usable)
2. Add /api/duplicates endpoint handler
3. Port MCP warning in tasks handler
4. Port TUI startup warning in board + unified-view
5. Port WebUI banner + component
6. Port existing tests
7. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

1. **Create `src/utils/duplicate-detection.ts`**
   - `scanForDuplicateIds(tasks: Task[]): DuplicateGroup[]`
   - Returns list of groups where each group has the duplicate ID and the tasks sharing it

2. **Add server endpoint `/api/duplicates`**
   - Add `handleGetDuplicates` to `src/server/handlers/system.ts`
   - Add `handleGetDuplicates` to `RouteHandlers.system` type in `src/server/router.ts`
   - Register route in `buildRoutes()`

3. **Add MCP warning** in `src/mcp/tools/tasks/handlers.ts`
   - In `listRegularTasks`, prepend duplicate warning to output

4. **Add TUI warning** in `src/ui/board.ts`
   - In `renderBoardTui`, check for duplicates after loading tasks

5. **Add API client method** in `src/web/lib/api.ts`
   - `fetchDuplicates(): Promise<DuplicateGroup[]>`

6. **Create DuplicateIdWarning component** `src/web/components/DuplicateIdWarning.tsx`
   - Warning banner component
   - Wire into `Layout.tsx` near `HealthIndicator`

7. **Add tests** - `src/test/duplicate-detection.test.ts`

8. **Typecheck + lint + test**
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added duplicate task ID detection across all modalities: duplicate-detection.ts utility, /api/duplicates endpoint, MCP warning in task_list output, TUI startup warning in unified-view.ts, WebUI DuplicateIdWarning banner in Layout.tsx. 9 tests passing. Based on upstream PR #632 by brooksc.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->
