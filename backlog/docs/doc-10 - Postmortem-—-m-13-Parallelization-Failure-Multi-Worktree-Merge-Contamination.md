---
id: doc-10
title: 'Postmortem — m-13 Parallelization Failure: Multi-Worktree Merge Contamination'
type: guide
created_date: '2026-05-24 12:28'
tags:
  - postmortem
  - m-13
  - parallelization
  - worktree
  - incident
---
# Postmortem: m-13 Parallelization Failure

**Date:** 2026-05-24
**Incident:** Multi-worktree merge contamination during m-13 implementation
**Impact:** ~2 hours of diagnostic + fixup work, 41+ merge artifact TypeScript errors, polluted working tree

## Summary

Four parallel sub-agents executed Round 1 of m-13 tasks directly in the main working tree while four git worktrees (back-486/487/488/493) were simultaneously being merged into main. The sub-agent changes were auto-committed as "WIP: pre-existing changes on main" (`9c1870c`) and became the base for the worktree branches. When the worktree branches merged (`8ca0e7b`), the codebases had diverged — creating duplicate function declarations, missing method references (listDocs/editDoc/editDecision), LabelConfig type mismatches, and broken router routes.

## Root Cause

The sequence was:
1. Sub-agents wrote code to main working tree (uncommitted)
2. An external process committed worktree changes as `9c1870c`
3. Four worktree branches were created FROM `9c1870c` (inheriting the sub-agent changes)
4. Worktree branches added LabelConfig/subtask code that referenced methods not in main
5. All four worktrees merged into main simultaneously — creating compile-breaking merge artifacts

## Symptoms

- 210 tsc errors in src/ (initially counted including worktree dirs)
- ~41 actual src/ errors: duplicate functions in config.ts, label routes in router.ts, LabelConfig type mismatches across 10+ files, missing method references
- `get completedDir()` getter was dead code (safely removed)
- Biome violations across 20+ test files (pre-existing, surfaced by full scan)

## Resolution

- Fixed 6 own errors (completedDir removal, async iterator fix, mcp/server.ts floating call, unused $ import)
- Deduplicated config.ts (removed 3 duplicate label handler functions)
- Fixed router.ts routes
- Fixed LabelConfig type mismatches across 10+ files
- Fixed biome issues across 20+ test files
- Restored `bunx tsc --noEmit` → 0 errors in src/
- Restored `bun run check .` → exit 0

## Preventive Measures (Procedural Memory Saved)

**Rule:** When sub-agents write to the same working tree as active git worktrees:
1. Always run file-conflict analysis before parallelization
2. Use sequential worktree pattern: Worktree 1 → merge to main → Worktree 2 (from updated main) → merge → ...
3. Never merge multiple worktree branches simultaneously if they touch the same files
4. Sub-agents should be dispatched in sequential rounds when file overlap exists
5. Always verify `bunx tsc --noEmit` + `bun run check .` after each merge

## What Was Actually Implemented (Round 1 Success)

| Task | Status | Notes |
|------|--------|-------|
| BACK-257 | Done | Deep link URLs for tasks (/board/:id, /tasks/:id) |
| BACK-532 | Done | backlog open CLI + MCP tool |
| BACK-529.1 | Done | completed → archive/tasks migration |
| BACK-529.5 | Done | Statistics: archived tasks list |
| BACK-529.6 | Partially | completeTask() moves to archive/ but doesn't set status: Archived |
| Fixup | Done | Biome/tsc cleanup across 60 files |

## Remaining Work

| Task | Priority | Effort |
|------|----------|--------|
| BACK-529.2 — completeTask CLI+WebUI unify | High | 2h |
| BACK-529.3 — Grüner Button Logic | High | 1h |
| BACK-529.4 — Sidebar Completed Counter | Medium | 1h |
| BACK-529.6 — Frontmatter "Archived" setzen | Medium | 1h |
| BACK-529.7 — Reopen Guard | Medium | 1h |
| BACK-531 — Dependency Write-Guard | High | 3h |
| BACK-530 — Research → 2 impl tickets | Low | Research |

## Git State (End of Session)

- HEAD: `8ca0e7b`
- Uncommitted: 60 files (fixup work, biome cleanup, config.ts dedup)
- No new worktree branches created
- All code changes are in main working tree
