---
id: BACK-492.21
title: 'TechDebt: Unify error surface with shared AppError type across all modalities'
status: Done
assignee: []
created_date: '2026-05-21 16:02'
updated_date: '2026-05-21 22:58'
labels: []
dependencies: []
modified_files:
  - src/utils/app-error.ts
  - src/mcp/errors/mcp-errors.ts
  - src/server/index.ts
  - src/cli.ts
parent_task_id: BACK-492
priority: low
ordinal: 203000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Each entry point handles errors differently, with no shared taxonomy:

| Modality | Error surface |
|---|---|
| MCP | Typed `McpError` with error codes (`src/mcp/errors/mcp-errors.ts`) — most structured |
| Server | `Response.json({ error: "..." }, { status: N })` per handler; `handleError()` for uncaught |
| CLI | `console.error()` + `process.exit(1)` — no typed errors, no codes |
| TUI | Silent `try/catch` with `console.warn` or ignored; errors rarely surface |

A shared `AppError` type with a `code` field and per-modality formatters would allow consistent error handling while preserving each modality's output format.

Implementation plan:
1. Design `AppError` type: `{ code: string; message: string; details?: unknown }`
2. Create `src/utils/app-error.ts` with:
   - `AppError` class extending `Error`
   - Predefined error codes (`NOT_FOUND`, `VALIDATION`, `CONFIG`, `INTERNAL`, etc.)
   - `formatForCLI()`, `formatForMCP()`, `formatForServer()` formatters
3. Refactor MCP error handlers to produce `AppError` → MCP errors
4. Refactor CLI error paths to use `AppError` + `formatForCLI()`
5. Refactor Server error handlers to use `AppError` + `formatForServer()`
6. Keep TUI as-is initially (lowest priority) — but wire the formatter

Note: This is a refactoring task. Do not change user-visible error messages, only the internal representation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 src/utils/app-error.ts created with AppError class and formatters
- [ ] #2 #2 MCP layer uses AppError internally (output format unchanged)
- [ ] #3 #3 CLI error paths use AppError (output format unchanged)
- [ ] #4 #4 Server error handlers use AppError (output format unchanged)
- [ ] #5 #5 bun test passes
- [ ] #6 #6 No user-visible error message changes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
