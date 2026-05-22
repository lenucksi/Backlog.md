---
id: BACK-515.2
title: 'Decisions: CLI list, view, supersede commands'
status: Done
assignee: []
created_date: '2026-05-21 16:03'
updated_date: '2026-05-22 15:40'
labels:
  - decisions
  - cli
milestone: m-14
dependencies:
  - BACK-515.1
modified_files:
  - src/commands/decisions.ts
  - src/cli.ts
parent_task_id: BACK-515
priority: medium
ordinal: 208000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add decision sub-commands to CLI (currently only `decision create` exists):

Commands to add:
- `decision list` — list all decisions (table: ID, title, date, status)
  - Filter: `--status proposed|accepted|rejected|superseded`
  - Filter: `--supersedes <id>` — find what a decision supersedes
  - Filter: `--superseded-by <id>` — find what superseded a decision
- `decision view <id>` — show full decision content (context, decision, consequences, alternatives, supersede links)
- `decision supersede <id> --title "..."` — supersede an existing decision:
  1. Opens editor for the NEW decision content (context, decision, consequences)
  2. Creates new decision with status "accepted" and `supersedes: <old-id>`
  3. Updates old decision: status → "superseded", `supersededBy: <new-id>`
  4. Shows both IDs and their relationship on success

The supersede command is the primary workflow for decision evolution. No `decision edit` — decisions are immutable once finalized; evolution happens via supersede chain.

Implementation plan:
1. Extract decision commands into `src/commands/decisions.ts` (following CLI handler extraction pattern from BACK-492.8)
2. `list`: list all decisions from core, format as table, filter options
3. `view`: load single decision, display all fields + supersede links
4. `supersede`: 
   - Validate old decision exists and isn't already superseded
   - Create new decision with `supersedes` field
   - Update old decision with `supersededBy` + status change
   - Commit both changes atomically
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 backlog decision list shows all decisions with filters
- [ ] #2 #2 backlog decision view <id> shows full decision content
- [ ] #3 #3 backlog decision supersede <id> creates successor and marks old as superseded
- [ ] #4 #4 Old decision and new decision show cross-links
- [ ] #5 #5 No decision edit command exists (decisions are immutable)
- [ ] #6 #6 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
