---
id: BACK-0578
title: Add sort by creation date option to board column menu
status: Done
assignee: []
created_date: 2026-06-26 17:34
updated_date: 2026-06-26 23:37
labels:
  - upstream
  - enhancement
  - webui
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/694
priority: medium
ordinal: 330000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/694 — [Feature]: Add option to sort tasks by Creation Date

## What this is
Das Board-Column-Menü (Dropdown in `TaskColumn.tsx`) hat aktuell nur "Sort by Priority". Nutzer wollen auch "Sort by Creation Date" mit aufsteigend/absteigend.

## Unser Status Quo
- **WebUI Task List** (Tabellen-Ansicht) unterstützt bereits `"created"` als Sort-Option (asc/desc)
- **Board Column** (`src/web/components/TaskColumn.tsx`) hat nur "Sort by Priority"
- **`src/utils/task-sorting.ts`**: hat `sortByTaskId()`, `sortByPriority()`, `sortByOrdinal()` — kein `sortByCreatedDate()`
- **CLI `--sort`**: akzeptiert `priority`, `id`, `ordinal` — kein `created`
- **MCP/REST**: kein sort parameter
- **TUI Board**: hardcoded sort, kein Column-Menu

`createdDate` ist bereits auf allen Tasks vorhanden (wird von Frontmatter `created_date` geparst, in Types definiert, auf allen Modalities verfügbar).

## Relationship zu BACK-567
BACK-567 (board sort per status & exclude option, #689) ist ein größeres Feature: per-column sort framework mit localStorage persistence. Dieser Task ist ein **einfacher, schneller Quick-Win**: nur einen weiteren Eintrag ins Column-Dropdown + `sortByCreatedDate()` Utility hinzufügen. BACK-567s Framework würde das später natürlich subsumieren.

## Implementation Plan

### Option A: WebUI-only (~1-2h)
1. `src/utils/task-sorting.ts`: `sortByCreatedDate(tasks, direction)` hinzufügen (+ zu `sortTasks()` dispatch, + `CreatedDateAsc`/`Desc` enum-Werte)
2. `src/web/components/TaskColumn.tsx`: "Sort by Creation Date" Button ins Column-Menu (neben "Sort by Priority"), asc/desc toggle

### Option B: Multi-Modality (~3-4h, empfohlen)
3. CLI: `"created"` zu `--sort` validation in `src/commands/task.ts` hinzufügen
4. MCP: TaskListArgs um sort parameter erweitern
5. REST: sort param auf task list endpoint

### Option C: TUI inklusive (~6-8h, nur wenn TUI Board Column-Menü existieren soll)
6. TUI Board: neue Keybinding + sort-selection popup

## Empfohlen: Option A + CLI (WebUI + CLI) ~3h
- Höchster Value pro Aufwand
- BACK-567 kann später das volle Framework liefern
- Dieser Task wird dann von BACK-567 subsumiert

## Complexity
**NIEDRIG** (WebUI-only ~1-2h, mit CLI + MCP ~3-4h). Die Daten existieren bereits (`createdDate` auf jedem Task). Der Task List zeigt bereits dass `"created"` sorting funktioniert.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Board column menu has "Sort by Creation Date" option alongside "Sort by Priority"
- [x] #2 Sort direction toggles between ascending (oldest first) and descending (newest first)
- [x] #3 CLI task list --sort accepts "created" value
- [ ] #4 MCP task_search supports sort by created date
- [x] #5 created_date already exists on all tasks — no data work needed
- [x] #6 bunx tsc --noEmit passes, bun run check . passes, bun test passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Caveat: Das Column-Menü (Sort by Priority und Sort by Creation Date) wird nur angezeigt wenn `canSortByPriority` truthy ist. Erfordert onTaskReorder (Drag-and-Drop aktiv), >1 Task in der Column, und KEINE Branch-Tasks (tasks.every(t => !t.branch)). Letzteres ist der häufigste Grund warum das Menü fehlt — Columns mit Tasks "From main branch" haben kein Menü, da Branch-Tasks nicht re-orderbar sind. Dieses Verhalten ist konsistent mit dem vorherigen "Sort by Priority"-Button und wurde durch BACK-578 nicht verändert.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->