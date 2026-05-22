---
id: BACK-516.2
title: 'Parity: CLI backlog stats command'
status: Done
assignee: []
created_date: '2026-05-21 16:03'
updated_date: '2026-05-22 01:28'
labels:
  - parity
  - cli
dependencies: []
modified_files:
  - src/commands/statistics.ts
  - src/cli.ts
parent_task_id: BACK-516
priority: medium
ordinal: 212000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose task statistics via CLI. Currently only WebUI has a statistics endpoint (`/api/statistics`).

Implementation plan:
1. `Core` already has `loadAllTasksForStatistics()` — used by WebUI
2. Add `backlog stats` CLI command:
   - Default: human-readable table with total tasks, by-status breakdown, by-priority breakdown, milestone counts
   - `--json`: JSON output for scripting
3. Optional: `--milestone <name>` to scope stats to a milestone
4. Follows the output pattern of other CLI list commands (tables, column alignment)

Implementation plan:
1. Add `src/commands/statistics.ts` handler
2. Wire into CLI command registration
3. Dedicated handler calling Core statistics methods
4. Terminal table renderer matching existing CLI conventions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 backlog stats shows task statistics in human-readable format
- [ ] #2 #2 backlog stats --json outputs valid JSON
- [ ] #3 #3 Optionally: backlog stats --milestone <name> scopes to milestone
- [ ] #4 #4 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
