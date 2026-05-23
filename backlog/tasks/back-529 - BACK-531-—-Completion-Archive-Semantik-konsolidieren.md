---
id: BACK-529
title: BACK-531 — Completion/Archive-Semantik konsolidieren
status: To Do
assignee: []
created_date: '2026-05-22 18:41'
labels:
  - cleanup
  - parity
  - ux
  - tasks
  - breaking
milestone: m-13
dependencies: []
priority: high
ordinal: 245000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Das aktuelle "Done/Complete/Archive"-System ist dreifach inkonsistent:

1. **Drei verschiedene Wege**: CLI `task complete` setzt nur Status, WebUI "Mark as completed" verschiebt roh (ohne Status-Update) nach `backlog/completed/`, `task archive` verschiebt nach `backlog/archive/tasks/`
2. **`backlog/completed/` ist unsinnig** — ein Top-Level-Ordner mit 305 roh-verschobenen Tasks, den keiner braucht
3. **Keine klare Trennung** zwischen "Done" (terminalStatus, kann reopened werden) und "Archived" (endgültig weg)
4. **Sidebar "Completed (305)" zeigt falschen Wert** wegen Hardcoded `count={0}` Bug
5. **Statistics (194) vs Sidebar (305) zählen unterschiedliche Dinge** mit gleichem Label

Ziel: Einheitliche Semantik, ein Weg für "finish & archive", klare Trennung zwischen Done und Archived.

## Design-Entscheidungen

- **"Finish & Archive"** := Task ist endgültig fertig → Status wird auf terminalStatus gesetzt + Datei wandert nach `archive/tasks/` + Frontmatter-Status wird auf `"Archived"` gesetzt
- **CLI `task complete`** macht das Gleiche wie WebUI "Finish & Archive"
- **`backlog/completed/` wird abgeschafft** → alle 305 Files nach `archive/tasks/` migrieren
- **Sidebar hat nur "Completed (N)"** = alle Tasks mit terminalStatus (sowohl in `tasks/` als auch in `archive/tasks/`)
- **Statistics** bekommt eine "Archived Tasks" Liste (analog "Blocked Tasks")
- **Archivierte Tasks** haben `status: "Archived"` → optisch erkennbar in Statistics-Liste, read-only, kein Reopen
- **Reopen** nur für Tasks in `tasks/` mit terminalStatus (nicht für archivierte)

## Subtasks

| Sub | Beschreibung | Aufwand |
|-----|-------------|---------|
| .1 | `backlog/completed/` → `archive/tasks/` Migration | ~1h |
| .2 | `completeTask()` CLI + WebUI vereinheitlichen | ~2h |
| .3 | Grüner Button Logik + Copy | ~1h |
| .4 | Sidebar Completed Counter fixen | ~1h |
| .5 | Statistics: Archived Tasks Liste | ~2h |
| .6 | Frontmatter: status "Archived" setzen beim Archivieren | ~1h |
| .7 | Reopen Guard | ~1h |

## Implementation Plan (Global)

### Phase 1: Cleanup (.1 + .6)
- Lösche `fs.completeTask()` Move nach `backlog/completed/` → Move nach `archive/tasks/`
- Migriere existierende 305 Files aus `completed/` nach `archive/tasks/`
- `fs.completeTask()` setzt Frontmatter auf `status: "Archived"`
- `listCompletedTasks()` liest aus `archive/tasks/`

### Phase 2: Konsolidierung (.2 + .3)
- CLI `task complete` macht das Gleiche: `core.completeTask()` statt nur `editTask(status: "Done")`
- Grüner Button: `isTerminalStatus(status) && !isBlockedStatus(status)`
- Label: "Finish & Archive"
- `TaskDetailsModal.tsx:586` von `includes("done")` auf `isTerminalStatus()` umstellen

### Phase 3: UI (.4 + .5 + .7)
- Sidebar "Completed (N)" = merged set mit `isTerminalStatus()` Filtern
- Statistics: "Archived Tasks" Liste (analog Blocked Tasks), klickbar, read-only, optisch erkennbar
- Reopen nur aus `tasks/`, nicht aus `archive/tasks/`

## References
- BACK-462 (terminalStatuses config)
- BACK-423 (Sidebar CollapsibleGroup + Completed Section)
- DOC-005 (Feature Parity Matrix)
- src/file-system/operations.ts (completeTask, archiveTask)
- src/commands/task.ts (handleTaskCompleteCommand)
- src/web/components/TaskDetailsModal.tsx (Mark as completed button)
- src/web/components/SideNavigation.tsx (Completed section)
- src/core/statistics.ts (blocked tasks list)
- src/server/handlers/tasks.ts (handleCompleteTask, handleListCompletedTasks)

## Dependencies
- BACK-423 (Sidebar Infrastruktur, Done)
- BACK-462 (terminalStatuses, Done)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 backlog/completed/ existiert nicht mehr, alle Tasks in archive/tasks/
- [ ] #2 #2 WebUI + CLI 'mark as completed' tun das Gleiche: Status auf terminalStatus + Datei nach archive/tasks/
- [ ] #3 #3 Grüner Button nur bei terminalStatus und nicht blockedStatus
- [ ] #4 #4 Sidebar 'Completed (N)' zählt terminalStatus über tasks/ + archive/tasks/
- [ ] #5 #5 Statistics zeigt Archived Tasks Liste (analog Blocked Tasks Liste)
- [ ] #6 #6 Archivierte Tasks haben status: Archived im Frontmatter
- [ ] #7 #7 Archived Tasks können nicht reopened werden
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
