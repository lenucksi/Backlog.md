---
id: BACK-530
title: 'BACK-532 — Project Health: Blocked/Deadlocked Tasks Analyse + Umsetzung'
status: Done
assignee:
  - opencode
created_date: '2026-05-22 18:42'
updated_date: '2026-05-24 13:57'
labels:
  - research
  - statistics
  - ux
  - dependencies
  - sequences
milestone: m-13
dependencies: []
references:
  - BACK-217
  - BACK-218
  - BACK-474
  - src/core/sequences.ts
priority: medium
ordinal: 253000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Die "Project Health" Section in Statistics hat aktuell eine "Blocked Tasks" Liste, die Dependency-basiert ist (Tasks deren Dependencies nicht terminal sind). Aber:

1. Es gibt auch status-basiertes "blocked" (via `blockedStatuses` Config, roter Punkt)
2. Deadlocks (zirkuläre Dependencies) werden gar nicht erkannt — Tasks die sich gegenseitig blockieren
3. Die Sequences-Engine (`src/core/sequences.ts`) hat bereits Zyklus-Erkennung via Kahns Algorithmus

## Was die Research schon ergeben hat

### Blocked aktuell
- `blockedStatuses` Config → roter Punkt in TUI + rote Column-Badge in WebUI
- Statistics: Dependency-basiert (`task.dependencies` mit nicht-terminalen Dependencies)
- 3-Stufen-Matching: Konfig → Hardcoded "Blocked" → Substring "blocked"
- Nur WebUI zeigt Task-Liste; CLI + MCP nur Count

### Deadlock Detection
- `src/core/sequences.ts` hat Kahns Algorithmus mit Cycle-Detection
- Zyklen werden in einen finalen "Garbage Layer" geschoben
- KEINE separate `detectDeadlocks()` Funktion
- KEINE Write-Time-Validierung

## Was zu tun ist

### Phase 1: Research abschließen (bereits teilweise erledigt)
- Genauen Code für blocked/status/deadlock dokumentieren
- Sequences-Engine API für Cycle-Detection checken

### Phase 2: UX Design
- Zwei Kategorien in Statistics:
  - **Blocked** = Task hat nicht-terminale Dependency (bestehend)
  - **Deadlocked** = Task in zirkulärer Dependency-Kette (neu)
- Wie visualisieren? (Zyklus-Pfad anzeigen: A → B → C → A)
- Soll Write-Time-Validation kommen? (Warnung beim Setzen von Dependencies)

### Phase 3: Implementierung
- `detectDeadlocks()` Funktion (Tarjan SCC oder Reuse Kahns)
- Statistics um Deadlocked-Liste erweitern
- Alle Modalitäten (CLI, TUI, WebUI, MCP)
- Optional: Dependency-Write-Guard

## References
- BACK-217 (Sequences Web UI)
- BACK-218 (Sequences Tests + Docs)
- BACK-474 (Sequences Research)
- src/core/sequences.ts
- src/core/statistics.ts
- src/utils/terminal-status.ts
- src/ui/status-icon.ts
- src/web/components/Statistics.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Research: Aktuelle blocked-Mechanismen dokumentiert (Code + Config)
- [x] #2 #2 Research: Topologische Deadlock-Erkennung via Sequences-Engine geprüft
- [x] #3 #3 UX-Design: Blocked + Deadlocked Tasks Liste in Statistics festgelegt
- [x] #4 #4 Implementierung: Blocked Tasks Liste (status-basiert) in Statistics
- [x] #5 #5 Implementierung: Deadlocked Tasks (Zyklus-Erkennung) in Statistics
- [x] #6 #6 Implementierung: CLI/WebUI/MCP alle zeigen Blocked+Deadlocked Daten
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan (approved)

### Files changed (in order):

1. **New: src/utils/deadlock-detection.ts** — `detectDeadlocks(tasks)` using Tarjan SCC
2. **Edit: src/core/statistics.ts** — add `blockedStatuses` param, `deadlockedTaskGroups`, `blockedByStatus` to TaskStatistics
3. **Edit: src/commands/statistics.ts** — pass config, show deadlocks in renderTable
4. **Edit: src/mcp/tools/statistics/handlers.ts** — pass blockedStatuses, add to response
5. **Edit: src/mcp/tools/statistics/schemas.ts** — add deadlockedTaskGroups to schema
6. **Edit: src/server/handlers/system.ts** — pass blockedStatuses
7. **Edit: src/ui/overview-tui.ts** — show deadlocked section
8. **Edit: src/web/components/Statistics.tsx** — Deadlocked + BlockedByStatus sections
9. **New: src/test/deadlock-detection.test.ts** — tests for detectDeadlocks
10. **Edit: src/test/statistics.test.ts** — tests for new fields
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementation Summary

### New: `src/utils/deadlock-detection.ts`
- `detectDeadlocks(tasks: Task[]): string[][]` using Tarjan's SCC algorithm
- Returns groups of task IDs forming cycles (2+ tasks per group)
- Filters out self-loops and single-node SCCs
- 9 tests covering empty lists, linear chains, simple cycles, 3-node cycles, multi-cycle, and edge cases

### Modified: `src/core/statistics.ts`
- Added `blockedStatuses?: string[]` parameter to `getTaskStatistics()`
- `TaskStatistics.projectHealth`:
  - `blockedByStatus: Task[]` — tasks whose status matches `blockedStatuses` config (status-based blocking, separate from the existing dependency-based `blockedTasks`)
  - `deadlockedTaskGroups: string[][]` — circular dependency groups from `detectDeadlocks()`

### Modified: `src/core/backlog.ts`
- `loadAllTasksForStatistics()` now returns `blockedStatuses` from config

### Modified callers to pass `blockedStatuses`:
- `src/commands/statistics.ts` — CLI `backlog stats` shows blocked-by-status count + deadlock groups with cycle paths
- `src/commands/overview.ts` — passes `blockedStatuses` to `getTaskStatistics`
- `src/mcp/tools/statistics/handlers.ts` — returns `blockedByStatusCount` + `deadlockedTaskGroups` in MCP response
- `src/server/handlers/system.ts` — passes `blockedStatuses` to `getTaskStatistics`
- `src/ui/overview-tui.ts` — TUI shows deadlocked tasks section with cycle paths

### Modified: `src/web/components/Statistics.tsx`
- Project Health summary row shows deadlocked count (purple dot)
- Expandable sections: "Blocked by Status" (orange), "Deadlocked Tasks" with cycle paths (purple, monospace)

### Modified tests:
- `src/test/markdown-test-helpers.ts` — updated mock projectHealth
- `src/test/deadlock-detection.test.ts` — 9 tests for `detectDeadlocks()`

### Cross-modality coverage:
- **CLI**: `backlog stats` shows blocked-by-status + deadlocked groups with cycle paths
- **TUI**: `backlog overview` shows deadlocked section
- **WebUI**: Statistics page shows Blocked by Status + Deadlocked sections
- **MCP**: `backlog_get_statistics` returns `blockedByStatusCount` + `deadlockedTaskGroups`
- **REST**: /api/statistics includes new fields via spread of TaskStatistics
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
