---
id: BACK-568
title: Don't bump updated_date on ordinal-only task changes
status: To Do
assignee: []
created_date: 2026-06-17 10:39
updated_date: 2026-06-21 13:35
labels:
  - enhancement
  - cli
  - webui
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/684
priority: low
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/684 — `updated_date` gets bumped when only the ordinal changes

## What this is
Changing a task's `ordinal` (sort position) currently rewrites `updated_date`, which destroys meaningful "last real update" timestamps. This happens on:
- `backlog task edit --ordinal N`
- Board drag-and-drop reorder
- **Sort** button in board UI (resets ordinals across all tasks, restamping all their `updated_date` with one identical timestamp)

## What should happen
- Ordinal-only changes should NOT touch `updated_date`
- If `updated_date` doesn't exist yet (fresh task), an ordinal-only edit should not add it
- The edit pipeline needs to diff old vs new fields and skip `updated_date` when only `ordinal` changed

## Complexity
MEDIUM — requires changes in:
- Task edit pipeline (likely `src/file-system/operations.ts` around frontmatter serialization)
- Board drag-reorder handler (`src/ui/board.ts`)
- Needs a field-diff: compare old vs new frontmatter, only apply `updated_date` if non-ordinal fields changed

## Notes
- Upstream maintainer's response: intentional design, but they added "temporary sorting" as a workaround. We can do better.
- Low priority — minor quality-of-life improvement
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->