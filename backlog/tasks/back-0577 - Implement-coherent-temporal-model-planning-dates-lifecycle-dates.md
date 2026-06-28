---
id: BACK-0577
title: "Implement coherent temporal model: planning dates + lifecycle dates"
status: Done
assignee: []
created_date: 2026-06-26 17:33
updated_date: 2026-06-26 23:01
labels:
  - upstream
  - enhancement
  - core
  - cli
  - webui
  - mcp
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/698
  - https://github.com/MrLesk/Backlog.md/issues/551
priority: medium
ordinal: 329000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/698 — [Feature]: A coherent temporal model — planning dates (defer/due) + auto-stamped lifecycle dates (completed/archived)
- https://github.com/MrLesk/Backlog.md/issues/551 — due dates (related, tracked as BACK-401)

## What this is
Backlog.md hat reiche Status-Semantik aber fast kein Zeitbewusstsein. Tasks haben nur `created_date` und `updated_date`. Viele offene Issues sind Facetten dieser Lücke (#551, #684, #694, #697, #667, #456). Dieser Task implementiert das in Issue #698 vorgeschlagene kohärente Zeitmodell.

## Das Modell (nach #698)

### 1. Planning Dates — User-set, mutable, optional
- **`due_date`** — Deadline. Ermöglicht overdue flags, "fällig diese Woche", Sortierung nach Fälligkeit
- **`defer_date`** — Start/Snooze. "Zeige nicht vor Datum X." Ein deferrer Task verlässt das aktive Board und taucht am Stichtag automatisch wieder auf. GTD "Tickler" / Things "When" date.

### 2. Lifecycle Dates — Tool-gestempelt, immutabel, set-once
- **`completed_date`** — Wird gestempelt wenn Status → terminal (Done/terminalStatus). Der echte "wann wurde es fertig"-Timestamp. NICHT der File-Move ins Archiv.
- **`archived_date`** — Wird gestempelt wenn task archiviert wird (aufgegeben/duplikat). Symmetrischer Audit-Trail.

### Design Rules
- ISO date strings, kein Scheduling-Engine
- Menschen setzen Planning Dates; das Tool setzt Lifecycle Dates und überschreibt sie nie
- Stempel auf Status-Transition, nicht auf File-Move
- `normalizeDate()` Infrastruktur existiert bereits (von `createdDate`/`updatedDate`)

## Unser Status Quo
- **Nichts davon existiert** in Types, Parser, Serializer, CLI, WebUI, MCP, Server
- BACK-401 (dueDate, geplant) ist **To Do / nie gestartet**
- BACK-550 (Port date fields from PR #669) ist **To Do**
- BACK-529 (Done) setzt `status: Archived` beim Completen, aber stamped KEINE Datumsfelder
- `normalizeDate()` in `src/markdown/parser.ts` ist etabliert (wird von createdDate/updatedDate genutzt)

## Implementation Plan (~250 Zeilen, meist mechanisch)

### 1. Types (`src/types/index.ts`)
- `dueDate?: string`, `deferDate?: string`, `completedDate?: string`, `archivedDate?: string` zu `Task` + `TaskCreateInput` + `TaskUpdateInput`

### 2. Markdown Parser (`src/markdown/parser.ts`)
- 4 neue Frontmatter-Keys parsen: `due_date`, `defer_date`, `completed_date`, `archived_date`
- Nutzt existierende `normalizeDate()`

### 3. Markdown Serializer (`src/markdown/serializer.ts`)
- 4 neue Keys serialisieren (optional → nur wenn gesetzt)

### 4. Core Backlog (`src/core/backlog.ts`)
- `completeTask()`: stamp `completed_date: <now>` (ZUSÄTZLICH zum existierenden `status: Archived`)
- `archiveTask()`: stamp `archived_date: <now>`
- `editTask()`: wenn Status-Change auf terminal → `completed_date` nur setzen wenn noch nicht gesetzt (immutable)

### 5. File System (`src/file-system/operations.ts`)
- Keine Änderungen nötig (Parser/Serializer handhaben Persistenz)
- Optional: Filter-Helper für "tasks completed > N days ago"

### 6. CLI (`src/commands/`)
- `--due-date`, `--defer-date` Flags auf `task create`/`task edit`
- `task list --overdue`, `--due-soon`, `--deferred` Filter
- `task list` Sortierung nach `due_date`

### 7. TUI (`src/ui/`)
- `due_date` in task details anzeigen
- Overdue-Visualisierung (rot?)
- Deferred tasks verstecken bis `defer_date` erreicht

### 8. WebUI (`src/web/`)
- Date-Picker in Task-Modal für due/defer
- Overdue-Indikator in TaskCard
- Deferred-Sektion in Board

### 9. MCP (`src/mcp/`)
- `task_create`/`task_edit`: `dueDate`, `deferDate` als optionale Parameter
- `task_search`/`task_view`: lifecycle dates im Output

### 10. Server/REST (`src/server/`)
- Accept in API payloads, return in responses

### 11. Tests (`src/test/`)
- Parser/Serializer Round-Trip für 4 neue Felder
- Auto-Stamping: completeTask setzt completed_date
- Auto-Stamping: archiveTask setzt archived_date
- Immutability: completed_date wird nicht überschrieben
- Planning Dates: CLI create/edit + Filter

## NOT in Scope (explizit deferred)
- Gantt-Views (plannedStart/plannedEnd) — separater Port von PR #669
- Actual-Task-Tracking (actualStart/actualEnd) — separater Port
- Recurrence/Calendar-Scheduling (will das Projekt nicht)
- Lifecycle-Hooks-System (#456) — Inline-Stamping ist ausreichend

## Complexity
**NIEDRIG** (~250 Zeilen über 10 Files, meist mechanisch). Das `normalizeDate()`-Pattern ist etabliert. Es folgt dem existierenden `createdDate`/`updatedDate`-Pattern.

## Dependencies
- **BACK-401** (To Do) — wird durch diesen Task abgelöst/ersetzt
- **BACK-550** (To Do) — Port von Upstream PR #669 date fields — dieser Task hier ist der bessere Ansatz (nach #698s Modell, nicht #669s Modell)
- **BACK-529** (Done) — `completeTask` Infrastruktur, wird erweitert
- **BACK-568** (Low) — updated_date auf Ordinal-Change (wird durch completed_date weniger kritisch)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 due_date field exists on Task type, parser, serializer, and all surfaces (CLI/TUI/WebUI/MCP/REST)
- [x] #2 defer_date field exists on Task type, parser, serializer, and all surfaces
- [x] #3 completed_date is auto-stamped when a task transitions to terminal status (Done)
- [x] #4 completed_date is immutable once set (never overwritten)
- [x] #5 archived_date is auto-stamped when a task is archived
- [x] #6 archived_date is immutable once set
- [x] #7 CLI --due-date and --defer-date flags on task create/edit
- [x] #8 CLI task list --overdue, --due-soon, --deferred filters
- [x] #9 WebUI shows due_date in task details with overdue indicator
- [x] #10 MCP task_create/ task_edit/ task_view support all 4 date fields
- [x] #11 Parser/serializer round-trip for all 4 fields
- [x] #12 Backwards compatible: existing tasks without these fields work unchanged
- [x] #13 bunx tsc --noEmit passes, bun run check . passes, bun test passes
<!-- AC:END -->





## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->