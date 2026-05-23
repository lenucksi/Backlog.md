---
id: BACK-523
title: 'BACK-524 — MCP: statistics tool (backlog_get_statistics)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 16:31'
labels:
  - mcp
  - statistics
  - parity
  - feature
milestone: m-13
dependencies: []
documentation:
  - doc-005
modified_files:
  - src/mcp/tools/statistics/schemas.ts
  - src/mcp/tools/statistics/handlers.ts
  - src/mcp/tools/statistics/index.ts
  - src/mcp/server.ts
priority: medium
ordinal: 226000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Statistics sind nur über CLI (`backlog stats`) und WebUI (`/api/statistics`) verfügbar. MCP-Agenten haben keinen Zugriff auf Projektstatistiken, was sie daran hindert, datengetriebene Entscheidungen zu treffen (z.B. „wie viele Tasks sind offen pro Milestone?").

(Basierend auf DOC-005 STUB-P4)

## What

### MCP `backlog_get_statistics` tool
- Input: `{ milestone?: string }` (optionaler Filter)
- Output identisch zu CLI `backlog stats --json`:
  - Total tasks, by status
  - By priority
  - By milestone
  - By assignee
  - Overdue/near-milestone counts

### Integration
- Nutzt `Core.loadAllTasksForStatistics()` oder äquivalent
- Folgt existierendem MCP tool pattern (schemas + handler + registration)

### CLI stats command als Referenz
- `src/commands/stats.ts` (aus BACK-516.2)
- CLI output formatter für --json/modis

## Implementation plan
1. Read CLI `backlog stats --json` output format + core statistics methoden
2. Read existing MCP tool pattern (schemas + handler)
3. Create src/mcp/tools/statistics/ directory mit:
   - schemas.ts: Zod schema für Input/Output
   - handlers.ts: Handler class
   - index.ts: Registration via createSimpleValidatedTool()
4. Typecheck + lint + test

## References
- DOC-005 STUB-P4
- BACK-516.2 (CLI backlog stats command)
- src/commands/stats.ts — CLI stats output format
- src/core/backlog.ts — loadAllTasksForStatistics()
- src/mcp/tools/decisions/ — MCP tool pattern reference
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created new MCP tool backlog_get_statistics in src/mcp/tools/statistics/ (3 files). Tool accepts optional milestone filter, returns statistics matching CLI --json format (total by status/priority/milestone/assignee). Registered in src/mcp/server.ts. 13 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
