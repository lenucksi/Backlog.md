---
id: BACK-523
title: 'BACK-524 — MCP: statistics tool (backlog_get_statistics)'
status: To Do
assignee: []
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 11:29'
labels:
  - mcp
  - statistics
  - parity
  - feature
milestone: m-13
dependencies: []
documentation:
  - doc-005
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
