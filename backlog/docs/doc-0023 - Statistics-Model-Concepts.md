---
id: doc-0023
title: Statistics Model & Concepts
type: other
created_date: 2026-06-26 23:45
---
# Statistics Model & Concepts

## Overview

The statistics system provides project health metrics across task lifecycle states. Computed server-side in `src/core/statistics.ts`, consumed by CLI (`src/commands/statistics.ts`), TUI (`src/ui/overview-tui.ts`), and WebUI (`src/web/components/Statistics.tsx`).

## Core Metrics

### Task Counts

| Metric | Definition | Source |
|--------|-----------|--------|
| **Active Tasks** | Tasks in `backlog/tasks/` with a valid status | `tasks[]` parameter |
| **Archived Tasks** | Tasks in `backlog/archive/` | `archivedTasks[]` parameter |
| **Total Tasks** | `activeTasks + archivedTasks` | Encompasses all tasks that ever existed |
| **Drafts** | Tasks in `backlog/drafts/` | `drafts[]` parameter |
| **Completed Tasks** | Terminal-status active tasks + all archived tasks | `doneActive + allArchived` |

### Completion Rate

```
completionPercentage = (completedTasks / totalTasks) * 100
```

- **completedTasks**: active terminal (Done) + all archived (including abandoned/duplicate)
- **totalTasks**: active + archived
- Capped at 100% for progress bar display, but the raw percentage can exceed 100% if terminal-status counting logic overcounts (edge case: tasks with a terminal status that were also archived — counted twice)

### Lifecycle Stages

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Draft   │ ──→ │ Active Task  │ ──→ │  Done    │
│(optional)│     │(To Do/In Prg)│     │(terminal)│
└──────────┘     └──────────────┘     └────┬─────┘
                                           │
                                   ┌───────▼───────┐
                                   │   Archived    │
                                   │(completed or  │
                                   │ abandoned)    │
                                   └───────────────┘
```

## Date Fields Used

| Field | Purpose in Statistics |
|-------|---------------------|
| `createdDate` | Task age calculation, recently created list |
| `updatedDate` | Recently updated list, staleness detection |
| `dueDate` | (*planned*) Overdue task detection in project health |
| `completedDate` | (*planned*) "Completed > N days ago" stale-completed detection |

## Staleness Detection

Current logic in `isStaleTask()`:
- Terminal tasks (Done) are **never** stale
- Non-terminal tasks are stale if `updatedDate || createdDate` is > 30 days ago
- Hot path for `completedDate` check: tasks completed > 30 days ago but never archived could be flagged

## Project Health

- **Average Task Age**: Mean days from creation to now (or to completion date for Done tasks)
- **Stale Tasks**: Active non-terminal tasks untouched for >30 days
- **Blocked Tasks (dependency)**: Tasks whose dependencies are not yet in terminal status
- **Blocked by Status**: Tasks whose status is in `blockedStatuses` config
- **Deadlocked Tasks**: Dependency cycles detected via `detectDeadlocks()`

## Modality Surface

| Modality | File | Key Functions |
|----------|------|--------------|
| Core | `src/core/statistics.ts` | `getTaskStatistics()` |
| CLI | `src/commands/statistics.ts` | Plain-text table output |
| TUI | `src/ui/overview-tui.ts` | Terminal dashboard |
| WebUI | `src/web/components/Statistics.tsx` | React dashboard with progress bars |
| REST | `src/server/handlers/system.ts` | `GET /api/system/statistics` |