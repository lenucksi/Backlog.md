---
id: BACK-476
title: Dedicated view for completed tasks
status: Done
assignee:
  - "@lenucksi"
created_date: 2026-05-08 20:56
updated_date: 2026-06-20 17:23
labels: []
milestone: m-8
dependencies: []
references:
  - BACK-423.3
  - BACK-529
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
If tasks are marked as "completed" they are moved to the completed folder and disappear from the columns. there is apparently no easy way to review, search, overview, and read them again. we want such a feature, both web and tui
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Superseded by BACK-423.3 (Completed Tasks Section in Sidebar) and BACK-529 (Completion/Archive-Semantik konsolidieren). The "dedicated view for completed tasks" concept is delivered through: (1) Sidebar "Archived Tasks" navigation link pointing to `/statistics#archived`, (2) Statistics page with dedicated "Archived Tasks" section including search, (3) Consolidated completion flow via `completeTask()` that moves tasks to `archive/tasks/` and sets `status: "Archived"`. Remaining: migration of 309 files from `backlog/completed/` to `archive/tasks/` (tracked in BACK-529 AC #1).
<!-- SECTION:FINAL_SUMMARY:END -->