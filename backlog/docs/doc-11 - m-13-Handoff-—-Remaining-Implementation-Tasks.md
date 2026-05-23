---
id: doc-11
title: m-13 Handoff — Remaining Implementation Tasks
type: guide
created_date: '2026-05-24 12:31'
tags:
  - handoff
  - m-13
  - implementation
  - start-prompt
---
# m-13 Handoff: Remaining Implementation

## Git State

- HEAD: `8ca0e7b` (merged worktree branches)
- Working tree has ~60 uncommitted files (fixup + biome cleanup + config dedup)
- `bunx tsc --noEmit` → 0 errors in src/
- `bun run check .` → exit 0
- Postmortem: `doc-10`

## Suggested Commits

Before starting new work, commit the fixup baseline:

```
BACK-merge - fix: biome/tsc cleanup post worktree merge contamination

- Remove dead get completedDir() getter and getCompletedDir() method
- Fix async iterator pattern in migrateCompletedTasks()
- Remove floating registerOpenTools() call from mcp/server.ts class body
- Remove unused import { $ } from server/index.ts
- Deduplicate label handler functions in config.ts (merge artifact)
- Fix LabelConfig type mismatches across label.ts, handlers.ts, routes
- Fix router.ts duplicate route key
- Apply biome --write --unsafe across 20+ test files
- Replace noExplicitAny with proper type casts in test helpers
- Replace noNonNullAssertion with proper type guards in test files
```

Then commit the implemented features:

```
BACK-257 - Deep link URLs for tasks in board and list views

Add /board/:id/:title and /tasks/:id/:title routes with auto-modal-open.
```

```
BACK-532 - backlog open CLI command + MCP tool

New backlog open <id> command + MCP backlog_open_in_browser tool.
Entity-aware URL construction (task/doc/decision).
```

```
BACK-529.1 - backlog/completed/ → archive/tasks/ migration

completeTask() now writes to archive/tasks/. Migration helper included.
```

```
BACK-529.5 - Statistics: Archived Tasks Liste

Add archivedTasks array to statistics. Visible in CLI, TUI, WebUI, MCP.
```

## Start Prompt for Next Session

```
Continue with m-13 implementation in /home/jo/kit/claude-code-llm-kram/Backlog.md.

State: 60 uncommitted fixup files. Commit them first with the suggested
messages above. After that, implement remaining m-13 tasks in this order:

ROUND 1 (parallel — no file overlap):
  BACK-529.6 — Frontmatter "Archived" setzen (operations.ts only)
  BACK-531 — Dependency Write-Guard (new files + core/backlog.ts)
  BACK-529.4 — Sidebar Completed Counter fixen (SideNavigation.tsx only)

ROUND 2 (after R1 — all depend on R1 or BACK-529.2):
  BACK-529.2 — completeTask CLI + WebUI vereinheitlichen
  BACK-529.3 — Grüner Button Logik (TaskDetailsModal.tsx)
  BACK-529.7 — Reopen Guard (core/backlog.ts + TaskDetailsModal.tsx)

ROUND 3 (research):
  BACK-530 — Blocked/Deadlocked Research abschließen
  → daraus 2 Implementation-Tickets erstellen

CRITICAL: Run file-conflict analysis before parallelizing. If same files
are touched, SEQUENTIALIZE (task1 → merge → task2 → merge). Do NOT
dispatch parallel sub-agents that touch overlapping files.

Postmortem: doc-10. Remaining tasks: BACK-529.2, .3, .4, .6, .7, BACK-531, BACK-530.
```
