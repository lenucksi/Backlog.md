---
id: BACK-517
title: Verify BACK-345.10 fixes after subsequent refactoring
status: Done
assignee:
  - "@opencode"
created_date: 2026-05-22 09:47
updated_date: 2026-06-08 20:22
labels:
  - verification
  - bug
  - refactoring
milestone: m-13
dependencies: []
priority: low
ordinal: 214000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

BACK-345.10 (Fix ID generation bugs and cleanup prefix-config leftovers) is marked Done but predates extensive refactoring:
- BACK-492.x TechDebt cluster (cognitive complexity reduction, unified filter logic, etc.)
- BACK-404.1 (Converge task creation into single canonical core pipeline)
- BACK-436 (Align document management across modalities)
- BACK-444 (Filesystem-only projects without Git)

These refactors may have changed or obviated the code paths that were fixed in BACK-345.10.

## What

Verify each fix/cleanup from BACK-345.10 still holds:

### Bugs (P1)
1. **Subtask case-sensitivity** — `src/core/backlog.ts` changed from `startsWith()` to case-insensitive. Has this code been refactored? Does the fix still apply?
2. **Draft promotion ignoring completed tasks** — `FileSystem.promoteDraft` added `listCompletedTasks()`. Has promoteDraft been moved/refactored?

### Cleanup (P2/P3)
3. **escapeRegex consolidation** — single export from prefix-config.ts, import in task-path.ts
4. **Unused `draft` field** — removed from PrefixConfig interface

## Method

1. Clone/cherry-pick the known-failing tests from BACK-345.10 test additions
2. Run them against current main
3. Read the current code at the affected locations
4. Report: fixes still valid, regressed, or superseded by later refactoring

## Expected Output
- ✅ All good — close as verified
- ❌ Regression found — create follow-up bug ticket
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All 4 fixes from BACK-345.10 verified intact: (1) case-insensitive subtask detection present at backlog.ts:1287, (2) promoteDraft includes completed tasks at operations.ts:618-620, (3) escapeRegex consolidated in prefix-config.ts, (4) draft field removed from PrefixConfig. All tests passing. No regressions. Closing as verified.
<!-- SECTION:FINAL_SUMMARY:END -->