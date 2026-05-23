---
id: BACK-430.1
title: 'BACK-430.1 — TUI: milestone/draft/document create screens'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 16:06'
updated_date: '2026-05-22 16:32'
labels:
  - tui
  - feature
milestone: m-12
dependencies: []
modified_files:
  - src/ui/create-milestone.ts
  - src/ui/create-draft.ts
  - src/ui/create-document.ts
  - src/ui/board.ts
  - src/ui/components/help-popup.ts
parent_task_id: BACK-430
priority: medium
ordinal: 241000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Phase 2 of TUI create screens: after BACK-430 adds task creation, this adds milestone, draft, and document creation.

## What
- Milestone: name + description form, creates via core milestone API
- Draft: title + status form, creates via core task create with status=Draft
- Document: title + optional path, creates via core doc API
- Keybindings in board.ts + task-viewer (e.g., 'm' for milestone, 'd' for draft, 'D' for doc)
- Each creation refreshes the current view

## Implementation plan
1. Read board.ts keybinding patterns
2. Build create-milestone screen
3. Build create-draft screen
4. Build create-document screen
5. Register keybindings
6. Typecheck + lint + test

## References
- BACK-430 (parent - TUI task creation)
- src/ui/board.ts
- src/core/backlog.ts
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Milestone creation via TUI (name + description form)
- [x] #2 #2 Draft creation via TUI
- [x] #3 #3 Non-decision document creation via TUI
- [x] #4 #4 Keybindings in board.ts for each (different from task create 'n' key)
- [x] #5 #5 All existing tests pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created 3 TUI create screens: create-milestone.ts (name+description), create-draft.ts (title+status), create-document.ts (title+path). Registered keybindings in board.ts: m/milestone, d/draft, D/document. All refresh current view on success. Added shortcuts to help-popup.ts.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
