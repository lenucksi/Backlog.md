---
id: BACK-559.02
title: "CLI + MCP: promote/demote Subtask Befehle und Tools"
status: To Do
assignee: []
created_date: 2026-06-20 17:30
labels: []
milestone: m-10
dependencies:
  - BACK-559.01
modified_files:
  - src/commands/task.ts
  - src/mcp/tools/tasks/index.ts
  - src/mcp/tools/tasks/handlers.ts
  - src/mcp/tools/tasks/schemas.ts
parent_task_id: BACK-559
priority: medium
ordinal: 322000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CLI-Commands und MCP-Tools für Subtask Promotion/Demotion, die auf der Core-Logik aus BACK-559.1 aufsetzen.

**CLI Commands (`src/commands/task.ts`):**
- `task demote-to-subtask <taskId> --parent <parentTaskId>` — Task zum Subtask machen
- `task promote-from-subtask <taskId>` — Subtask zum Top-Level-Task machen
- Pattern an `task demote <taskId>` (task→draft) und `draft promote <taskId>` (draft→task) anlehnen

**MCP Tools (`src/mcp/tools/tasks/`):**
- `task_demote_to_subtask` — Input: `id` (string) + `parentTaskId` (string)
- `task_promote` — Input: `id` (string)
- Schemas in `src/mcp/tools/tasks/schemas.ts`
- Handler in `src/mcp/tools/tasks/handlers.ts`
- Registration in `src/mcp/tools/tasks/index.ts`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `task demote-to-subtask <id> --parent <parentId>` CLI-Command funktioniert
- [ ] #2 `task promote-from-subtask <id>` CLI-Command funktioniert
- [ ] #3 `task_demote_to_subtask` MCP-Tool registriert und funktionsfähig
- [ ] #4 `task_promote` MCP-Tool registriert und funktionsfähig
- [ ] #5 Fehlerbehandlung: Task nicht gefunden, Parent nicht gefunden, zirkuläre Hierarchie
- [ ] #6 `bunx tsc --noEmit` passes
- [ ] #7 `bun test` passes
- [ ] #8 `bun run check .` passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->