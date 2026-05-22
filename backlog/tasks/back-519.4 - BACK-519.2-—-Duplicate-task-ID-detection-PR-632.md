---
id: BACK-519.4
title: 'BACK-519.2 — Duplicate task ID detection (PR #632)'
status: To Do
assignee: []
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 15:12'
labels:
  - upstream
  - feature
  - quality
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/632'
parent_task_id: BACK-519
priority: medium
ordinal: 221000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Add proactive duplicate task ID detection across all modalities. PR #632 by brooksc adds a utility, MCP warning, TUI warning, and WebUI banner.

## Key changes
- New `src/utils/duplicate-detection.ts` utility
- MCP: prepend duplicate warning to `task_list` output
- TUI: startup warning in board/unified-view
- WebUI: banner + `/api/duplicates` endpoint + DuplicateIdWarning component
- 9 existing tests

## Server adaptation needed
Current server uses handler modules + typed RouteHandlers. Need new handler in `src/server/handlers/system.ts` registered in RouteHandlers.

## Implementation plan
1. Port duplicate-detection.ts utility (directly usable)
2. Add /api/duplicates endpoint handler
3. Port MCP warning in tasks handler
4. Port TUI startup warning in board + unified-view
5. Port WebUI banner + component
6. Port existing tests
7. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
