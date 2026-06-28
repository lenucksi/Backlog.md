# BACK-577 — Temporal Model Implementation Plan

## Strategy
- Nur additive Änderungen, keine Refactorings
- Sequentiell (Phase für Phase), nach jeder Phase tsc + biome + test
- Nach jeder Phase commit
- Merge-Konflikte: neue optionale Felder immer ans Ende, Methoden nicht umbauen

## Phase 1: Core (Types + Parser + Serializer + Backlog stamping)

### 1a. Types (`src/types/index.ts`)
**Task** (nach `onStatusChange`):
```typescript
dueDate?: string;
deferDate?: string;
completedDate?: string;
archivedDate?: string;
```
**TaskCreateInput** (nach `rawContent`):
```typescript
dueDate?: string;
deferDate?: string;
```
**TaskUpdateInput** (nach `rawContent`):
```typescript
dueDate?: string;
deferDate?: string;
```

### 1b. Parser (`src/markdown/parser.ts`)
Nach `updatedDate:`-Zeile (ca. Zeile 178):
```typescript
dueDate: frontmatter.due_date ? normalizeDate(frontmatter.due_date) : undefined,
deferDate: frontmatter.defer_date ? normalizeDate(frontmatter.defer_date) : undefined,
completedDate: frontmatter.completed_date ? normalizeDate(frontmatter.completed_date) : undefined,
archivedDate: frontmatter.archived_date ? normalizeDate(frontmatter.archived_date) : undefined,
```

### 1c. Serializer (`src/markdown/serializer.ts`)
Nach `updated_date:`-Spread (ca. Zeile 73):
```typescript
...(task.dueDate && { due_date: task.dueDate }),
...(task.deferDate && { defer_date: task.deferDate }),
...(task.completedDate && { completed_date: task.completedDate }),
...(task.archivedDate && { archived_date: task.archivedDate }),
```

### 1d. Core Backlog (`src/core/backlog.ts`)
**`completeTask()`** — vor dem File-Move Task laden, `completedDate` und `updatedDate` stampen:
```typescript
// Vor const success = await this.fs.completeTask(taskId);
const task = await this.fs.loadTask(taskId);
if (task && !task.completedDate) {
    task.completedDate = new Date().toISOString().slice(0, 16).replace("T", " ");
    task.updatedDate = task.completedDate;
    await this.fs.saveTask(task);
}
```

**`archiveTask()`** — analog, `archivedDate` + `updatedDate` stampen.

**`updateTask()`** — nach Status-Change-Prüfung: wenn neuer Status terminal UND `completedDate` nicht gesetzt → stampen.

### 1e. Core createTaskFromInput (`src/core/backlog.ts`)
In `createTaskFromInput()`: `dueDate`/`deferDate` aus Input übernehmen.

### 1f. Core updateTaskFromInput (`src/core/backlog.ts`)
In `updateTaskFromInput()`: `dueDate`/`deferDate` aus Input übernehmen.

## Phase 2: CLI (`src/commands/task.ts`)

### 2a. `--due-date <date>` und `--defer-date <date>` auf `task create` / `task edit`
```typescript
.option("--due-date <date>", "due date for the task (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
.option("--defer-date <date>", "defer/show after date (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
```
In handler: `dueDate: options.dueDate`, `deferDate: options.deferDate` in Input mappen.

### 2b. `--sort created` und `--sort due`
`validSortFields` erweitern um `"created"`, `"due"`.

## Phase 3: MCP (`src/mcp/utils/schema-generators.ts`, `src/mcp/tools/tasks/handlers.ts`)

### 3a. Schema
`dueDate`, `deferDate` als optionale String-Parameter zu `task_create` und `task_edit` Schemas.

### 3b. Handler
In createTask/editTask: Input-Mapping `dueDate`, `deferDate`.
In viewTask/listTask: Output lifecycle dates.

## Phase 4: Server/REST (`src/server/handlers/tasks.ts`)

`dueDate`, `deferDate` in Create/Update Body akzeptieren.
In Response: lifecycle dates mitsenden.

## Phase 5: WebUI

### 5a. TaskDetailsModal (`src/web/components/TaskDetailsModal.tsx`)
Due-Date anzeigen, overdue-indicator (rot wenn past due).
Completed/Archived-Datum anzeigen wenn gesetzt.

### 5b. TaskCard (`src/web/components/TaskCard.tsx`)
Overdue-Indikator, kleines due-Datum.

## Phase 6: TUI (`src/ui/board.ts` + task-viewer-with-search.ts)
`due_date` in Task-Details anzeigen.

## Phase 7: Tests

### 7a. `src/test/markdown.test.ts`
Parser/Serializer Round-Trip für alle 4 Felder.

### 7b. `src/test/core.test.ts`
- completeTask stamped completedDate
- archiveTask stamped archivedDate
- completedDate immutable bei zweitem completeTask
- completedDate nicht überschrieben bei edit ohne Status-Change

## Nach jeder Phase
1. `bun x tsc --noEmit`
2. `bun run check .`
3. `bun test terminal-status markdown core.backlog` (oder relevanter Scope)
4. Commit: `BACK-577 - <Phase-Name>`
