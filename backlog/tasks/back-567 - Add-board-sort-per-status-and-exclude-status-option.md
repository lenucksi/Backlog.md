---
id: BACK-567
title: Add board sort per status and exclude-status option
status: To Do
assignee: []
created_date: 2026-06-17 10:39
updated_date: 2026-06-21 13:35
labels:
  - enhancement
  - webui
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/689
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/689 — [Feature]: sort per status, exclude status

## What this is
Two board-view improvements:
1. **Sort per status column** — Allow different sort orders per column (e.g. Done sorted by `updated_date` descending; To Do sorted by ordinal ascending). Currently the board uses a single sort for all columns.
2. **Exclude status** — Option to hide certain statuses from the board (e.g. hide Done tasks when they're not interesting).

## Dependencies / Related Tasks
- Link to existing board-sorting related tasks (BACK-504 kanban drag-and-drop sort reset fix, BACK-484 Web UI sort optimization, board.ts sort logic at src/ui/board.ts:64-88)

## Complexity
MEDIUM — needs per-column sort config, board state changes, localStorage persistence, and UI controls for sorting and exclusion. The board rendering lives in `src/ui/board.ts` and `src/ui/unified-view.ts`.

## Notes
- Consider reusing existing sort infrastructure from board.ts (ordinal-based custom sorting with rebalance fallback)
- Exclude filter could share logic with the label/status filter pattern
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->