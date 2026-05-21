---
id: BACK-515.4
title: 'Decisions: WebUI supersede links'
status: To Do
assignee: []
created_date: '2026-05-21 16:03'
labels:
  - decisions
  - web-ui
dependencies:
  - BACK-515.1
modified_files:
  - src/web/components/
  - src/server/index.ts
parent_task_id: BACK-515
priority: low
ordinal: 210000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add clickable supersede links to the WebUI decision views.

Changes:
1. **Decision detail view**: Show `supersedes` and `supersededBy` links at the top of the decision
   - "Supersedes: decision-42 — Use TypeScript v2 [link]"
   - "Superseded by: decision-43 — Use TypeScript v3 [link]"
2. **Decision list:** Show a "superseded by" badge/tag on superseded decisions
3. **Decision create:** After superseding, show both decisions with their status change
4. Fetching referenced decision titles for display (not just raw IDs)

Note: This is the lowest priority subtask since WebUI already has full CRUD. The core value is in CLI + MCP parity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Decision detail view shows supersedes/supersededBy links
- [ ] #2 #2 Decision list shows superseded-by badge
- [ ] #3 #3 Links navigate to the referenced decision
- [ ] #4 #4 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
