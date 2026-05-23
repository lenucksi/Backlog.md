---
id: BACK-529.5
title: 'BACK-529.5 — Statistics: Archived Tasks Liste'
status: To Do
assignee: []
created_date: '2026-05-22 18:42'
labels:
  - web-ui
  - statistics
  - feature
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: medium
ordinal: 249000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Archivierte Tasks sind nirgendwo browsbar außer im Dateisystem. Statistics braucht eine "Archived Tasks" Liste, analog zur "Blocked Tasks" Liste.

## What
- Statistics: Neuer Section "Archived Tasks" (analog "Blocked Tasks")
- Listet alle archivierten Tasks (aus `archive/tasks/`)
- Klickbar zum Lesen (read-only task view)
- Optisch erkennbar als archived (anderes Icon, muted styling)
- Kein Reopen/Edit möglich

## Implementation plan
1. `statistics.ts`: `archivedTasks` zum `TaskStatistics`-Typ hinzufügen
2. `loadAllTasks*` bereits lädt completed/ (bald archive/tasks/) — muss nur korrekt als archived markiert werden
3. `Statistics.tsx` (WebUI): Neue Section unter "Blocked Tasks" oder "Project Health"
4. MCP statistics tool: `archivedTaskCount` hinzufügen
5. CLI `backlog stats`: Archived count anzeigen
6. `bunx tsc --noEmit`
7. `bun run check .`
8. `bun test`

## Files
- `src/core/statistics.ts`
- `src/core/backlog.ts` (loadAllTasksForStatistics)
- `src/web/components/Statistics.tsx`
- `src/mcp/tools/statistics/`
- `src/commands/stats.ts`

## Dependencies
- BACK-529.1 (damit archive/tasks/ korrekt ist)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
