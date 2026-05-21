---
id: BACK-492.22
title: >-
  TechDebt: Add listAllMilestones() helper to eliminate repeated Promise.all
  pairs
status: Done
assignee: []
created_date: '2026-05-21 16:02'
updated_date: '2026-05-21 22:58'
labels: []
dependencies: []
modified_files:
  - src/file-system/operations.ts
  - src/cli.ts
  - src/mcp/tools/tasks/handlers.ts
  - src/server/index.ts
  - src/ui/task-viewer-with-search.ts
parent_task_id: BACK-492
priority: low
ordinal: 204000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In four separate places, active and archived milestones are fetched together as a `Promise.all` pair:

- `src/cli.ts:237-238`
- `src/mcp/tools/tasks/handlers.ts:66-67`
- `src/server/index.ts:222-223`
- `src/ui/task-viewer-with-search.ts:205`

```typescript
const [milestones, archivedMilestones] = await Promise.all([
    core.filesystem.listMilestones(),
    core.filesystem.listArchivedMilestones(),
]);
```

A single `listAllMilestones()` on the FileSystem (or Core) class would:
- Eliminate this repeated construction
- Ensure callers don't accidentally fetch only one half
- Provide a single point for caching, ordering, or filtering in the future

Implementation plan:
1. Add `listAllMilestones(): Promise<{ active: Milestone[]; archived: Milestone[] }>` to `src/file-system/operations.ts`
2. Optionally add a convenience wrapper on `Core`
3. Replace all 4 call sites with the new helper
4. Verify no behavior change
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 listAllMilestones() added to FileSystem
- [ ] #2 #2 All 4 call sites migrated to new helper
- [ ] #3 #3 No behavior change — bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
