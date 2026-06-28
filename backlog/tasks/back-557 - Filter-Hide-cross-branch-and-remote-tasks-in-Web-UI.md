---
id: BACK-557
title: "Filter: Hide cross-branch and remote tasks in Web UI"
status: To Do
assignee: []
created_date: 2026-06-09 17:18
updated_date: 2026-06-09 17:18
labels:
  - web-ui
  - filters
  - enhancement
dependencies: []
references:
  - src/types/index.ts:59 (Task.source)
  - src/core/backlog.ts:filterLocalEditableTasks
  - src/web/components/Board.tsx
  - src/web/components/TaskList.tsx
  - src/web/components/BoardPage.tsx
priority: medium
ordinal: 309000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The Web UI (Board + All Tasks) shows ALL tasks including those loaded from other branches (source: "local-branch" + source: "remote"). These cross-branch tasks are non-editable (see isLocalEditableTask()) and clutter the view.

CLI and MCP already have includeCrossBranch: false hardcoded. The Web UI lacks any equivalent filter.

## Research Summary

**Task.source values** (src/types/index.ts:59):
- undefined/"local" — tasks from current branch
- "remote" — tasks from remote git branches (origin/*)
- "local-branch" — tasks from other local git branches
- "completed" — completed/archived tasks

**Existing backend** — includeCrossBranch: false in queryTasks() calls filterLocalEditableTasks() which strips source: "remote" and "local-branch". No Web UI surface.

**No filter spec field** for source/branch in TaskFilterSpec, TaskListFilter, or SearchFilters.

**UI pattern**: Board.tsx + TaskList.tsx use URL search params + LabelFilterDropdown.

## Scope (MVP)

Add toggle "Show cross-branch tasks" (default on) in Board and All Tasks filter bars. When off, exclude tasks with source: "remote" and "local-branch". Filtering happens client-side on loaded tasks array — no backend changes needed.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Board filter bar has toggle/checkbox for cross-branch tasks
- [ ] #2 All Tasks filter bar has toggle/checkbox for cross-branch tasks
- [ ] #3 Toggle defaults to ON (show cross-branch tasks)
- [ ] #4 When OFF: tasks with source: remote or source: local-branch are hidden
- [ ] #5 Filter state persisted in URL search params (crossBranch param)
- [ ] #6 Existing isFromOtherBranch amber highlight removed when hide is active
- [ ] #7 No backend changes — pure client-side filter
<!-- AC:END -->