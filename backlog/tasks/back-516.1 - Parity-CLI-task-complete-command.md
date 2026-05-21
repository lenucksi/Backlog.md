---
id: BACK-516.1
title: 'Parity: CLI task complete command'
status: To Do
assignee: []
created_date: '2026-05-21 16:03'
labels:
  - parity
  - cli
dependencies: []
modified_files:
  - src/cli.ts
parent_task_id: BACK-516
priority: medium
ordinal: 211000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add `backlog task complete <id>` as a CLI sub-command — sugar for `backlog task edit <id> --status Done`.

Currently (from doc-005): TUI has Y-key for marking done, WebUI has POST /complete endpoint, MCP can set status via editTask, but CLI users must type `task edit --status Done`.

Implementation plan:
1. Add `task complete <id>` handler in CLI (or in extracted command module)
2. Maps to `core.updateTaskFromContent(id, { status: "Done" })` or equivalent
3. Output: "Task BACK-123 — Title marked as Done ✓"
4. Can accept multiple IDs: `backlog task complete BACK-123 BACK-124 BACK-125`
5. Optionally: `--with-message` to add a completion note

Implementation plan:
1. Locate the CLI handler registration for task commands
2. Add a `complete` sub-command handler
3. If `src/commands/task.ts` already extracted (BACK-492.8), add it there
4. Otherwise add to `src/cli.ts`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 backlog task complete <id> marks task as Done
- [ ] #2 #2 backlgo task complete <id1> <id2> supports multiple IDs
- [ ] #3 #3 Output confirms each task marked Done
- [ ] #4 #4 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
