---
id: BACK-492.19
title: 'TechDebt: Replace core.fs with core.filesystem getter across all call sites'
status: Done
assignee: []
created_date: '2026-05-21 16:01'
updated_date: '2026-05-21 22:58'
labels: []
dependencies: []
modified_files:
  - src/core/backlog.ts
  - src/cli.ts
  - src/commands/overview.ts
  - src/ui/board.ts
  - src/ui/sequences.ts
  - src/ui/task-viewer-with-search.ts
parent_task_id: BACK-492
priority: low
ordinal: 201000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`Core` exposes its FileSystem instance two ways: `Core.fs` (raw private backing field, line 173) and `Core.filesystem` (public getter, line 524). Ten call sites bypass the getter and access `core.fs` directly:

- `src/cli.ts` — lines 2486, 2562, 3350
- `src/commands/overview.ts` — line 39
- `src/ui/board.ts` — lines 1090, 1127, 1176, 1334, 1376
- `src/ui/sequences.ts` — line 421
- `src/ui/task-viewer-with-search.ts` — line 1131 (uses BOTH `core.filesystem` AND `core.fs`)

If `fs` is ever renamed (e.g. to `_fs` to signal private intent), all 10 sites break silently.

Implementation plan:
1. Replace all `core.fs` occurrences with `core.filesystem` across the codebase
2. Rename `Core.fs` to `Core._fs` to signal private intent (or keep and add a `@deprecated` tag)
3. Verify `bun test` + `bun run check .` pass
4. No behavior change — pure mechanical replacement
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 All 10 call sites using core.fs replaced with core.filesystem
- [ ] #2 #2 Core.fs field made private (_fs) or marked deprecated
- [ ] #3 #3 No behavior change — bun test passes
- [ ] #4 #4 bun run check . passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
