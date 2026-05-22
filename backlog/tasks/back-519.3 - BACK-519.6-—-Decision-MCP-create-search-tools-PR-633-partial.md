---
id: BACK-519.3
title: 'BACK-519.6 — Decision MCP create/search tools (PR #633 partial)'
status: To Do
assignee: []
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 15:12'
labels:
  - upstream
  - feature
  - mcp
  - decisions
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/633'
parent_task_id: BACK-519
priority: medium
ordinal: 220000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Add `decision_create` and `decision_search` MCP tools. We already have `decision_list`, `decision_view`, `decision_supersede`. PR #633 by abbyssoul provides these missing tools.

## Not needed
- CLI decision commands (we already have create/list/view/supersede)
- Decision update/edit (immutable pattern — use supersede)

## Implementation plan
1. Add `decision_create` MCP tool (follow existing patterns in src/mcp/tools/decisions/)
2. Add `decision_search` MCP tool
3. Wire through schemas.ts
4. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
