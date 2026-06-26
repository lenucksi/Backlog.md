---
id: BACK-0579
title: Add terminal-status guard to TUI \"Mark as completed\" action
status: Done
assignee: []
created_date: 2026-06-26 17:34
updated_date: 2026-06-26 20:22
labels:
  - upstream
  - enhancement
  - tui
milestone: "m-14: Upstream Integration"
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/697
priority: low
ordinal: 331000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/697 — [Bug]: TUI "Mark as completed" moves task to completed/ folder without setting status to Done

## What this is
Upstream #697 reported that der TUI `c`-Key ("Mark as completed") die Task in den completed-Ordner verschiebt ohne `status: Done` zu setzen.

## Unser Status
Der Bug existiert bei uns **NICHT** — BACK-529.6 hat gefixt dass `completeTask()` in `src/file-system/operations.ts` beim File-Move `status: Archived` setzt.

Was jedoch fehlt: ein **terminal-status Guard** in den TUI-Handlern. Der MCP `task_complete`-Tool validiert:
```typescript
if (!isTerminalStatus(task.status, statuses, terminalStatuses)) {
    throw AppError.validation(`Task ${task.id} is not ${terminalStatus}.`);
}
```

Die TUI-Handler tun das nicht:
- `src/ui/board.ts` — `handleContentAreaComplete` (line ~1060)
- `src/ui/task-viewer-with-search.ts` — `handleContentAreaComplete` (line ~1135)

Man kann `c` auf einem `To Do`-Task drücken und er verschwindet ins Archiv ohne je `Done` durchlaufen zu haben.

## Implementation Plan (~15 min)
1. In `src/ui/board.ts` `handleContentAreaComplete`: config laden, `isTerminalStatus` checken, ablehnen wenn nicht terminal
2. Gleiches in `src/ui/task-viewer-with-search.ts`

## Complexity
**TRIVIAL** — Guard hinzufügen analog zum MCP-Handler. ~15 Minuten.

## Dependencies
- BACK-529 (Done) — hat den eigentlichen Bug bereits gefixt
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TUI "Mark as completed" (c key) rejects tasks not in terminal status with a clear message
- [ ] #2 TUI task viewer (c key) rejects tasks not in terminal status with a clear message
- [ ] #3 Tasks already in terminal status can be completed as before
- [ ] #4 bunx tsc --noEmit passes, bun run check . passes, bun test passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Terminal-status guard in TUI handlers added before core.completeTask():

- `src/ui/board.ts:1073-1078` — `handleContentAreaComplete` checks `isTerminalStatus` after config load, shows yellow warning footer if not terminal
- `src/ui/task-viewer-with-search.ts:1136-1145` — `applyTaskLifecycleShortcut` checks `isTerminalStatus` after config load for "complete" action only, shows yellow warning via showTransientHelp
- Pattern mirrors MCP handler (`src/mcp/tools/tasks/handlers.ts:394-398`), using same `getTerminalStatus()` / `isTerminalStatus()` utils

Both files: import `getTerminalStatus` added.
TS type-check and biome check pass.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->