---
id: BACK-529.3
title: BACK-529.3 — Grüner Button Logik + Copy
status: Done
assignee: []
created_date: '2026-05-22 18:42'
updated_date: '2026-05-24 13:20'
labels:
  - web-ui
  - fix
  - ux
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: high
ordinal: 248000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Der grüne "Mark as completed" Button erscheint aktuell bei `includes("done")` — nicht Config-aware und kann auch bei blockedStatus erscheinen.

## What
- Button-Sichtbarkeit: `isTerminalStatus(status) && !isBlockedStatus(status)`
- Button-Label: "Finish & Archive"
- Tooltip/Erklärung: "Move this task to the archive. It cannot be reopened."

## Implementation plan
1. `TaskDetailsModal.tsx:586`: `includes("done")` → `isTerminalStatus()` mit Config-Prop
2. Blocked-Check: `blockedStatuses.some(bs => bs.toLowerCase() === status.toLowerCase())`
3. Label und Tooltip anpassen
4. `bunx tsc --noEmit`
5. `bun run check .`
6. `bun test`

## Files
- `src/web/components/TaskDetailsModal.tsx`

## References
- BACK-462 (terminalStatuses)
- src/utils/terminal-status.ts (isTerminalStatus)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 isTerminalStatus() statt includes("done") für Button-Sichtbarkeit
- [x] #2 Button-Label: "Finish & Archive"
- [x] #3 Tooltip: "Move this task to the archive. It cannot be reopened."
- [x] #4 Keyboard shortcut C nutzt isTerminal statt isDoneStatus
- [x] #5 Keine tsc Fehler
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TaskDetailsModal.tsx: Neue Import isTerminalStatus von utils/terminal-status.ts. isDoneStatus = includes("done") ersetzt durch isTerminal = isTerminalStatus(status, availableStatuses). Keyboard shortcut (line 277) und JSX Bedingung (line 612) auf isTerminal umgestellt. Button-Title und -Label aktualisiert.

Sub-Agent (general) für TaskDetailsModal.tsx Änderungen
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TaskDetailsModal.tsx: `isDoneStatus = includes("done")` ersetzt durch `isTerminal = isTerminalStatus(status, availableStatuses)`. Button-Label: "Finish & Archive". Tooltip: "Move this task to the archive. It cannot be reopened."
<!-- SECTION:FINAL_SUMMARY:END -->
