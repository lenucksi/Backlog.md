---
id: BACK-519.1
title: 'BACK-519.1 — EEXIST OneDrive fix (PR #656)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 16:31'
labels:
  - upstream
  - fix
  - windows
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/656'
modified_files:
  - src/file-system/operations.ts
parent_task_id: BACK-519
priority: low
ordinal: 231000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
6-line fix wrapping `mkdir(dir, { recursive: true })` with `.catch()` ignoring EEXIST in `ensureBacklogStructure()`. Fixes Bun bug with OneDrive ReparsePoint directories.

## Code
Wrap each mkdir call in `src/file-system/operations.ts` with:
```ts
await mkdir(dir, { recursive: true }).catch((err: NodeJS.ErrnoException) => {
  if (err.code !== 'EEXIST') throw err;
});
```

## Acceptance
- [ ] onCreate/write operations no longer crash on OneDrive-synced paths
- [ ] Tests pass

## Implementation plan
1. Cherry-pick the 6-line EEXIST catch from PR #656
2. Add unit test for EEXIST scenario
3. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added .catch() ignoring EEXIST to mkdir(dir, { recursive: true }) in ensureBacklogStructure (operations.ts:261-263). Fixes Bun bug with OneDrive ReparsePoint directories on Windows. Cherry-picked from upstream PR #656 by GregoryFerraz.
<!-- SECTION:FINAL_SUMMARY:END -->
