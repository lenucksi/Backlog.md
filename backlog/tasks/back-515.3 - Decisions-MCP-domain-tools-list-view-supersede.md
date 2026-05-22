---
id: BACK-515.3
title: 'Decisions: MCP domain tools (list, view, supersede)'
status: Done
assignee: []
created_date: '2026-05-21 16:03'
updated_date: '2026-05-22 01:28'
labels:
  - decisions
  - mcp
dependencies:
  - BACK-515.1
modified_files:
  - src/mcp/tools/decisions/handlers.ts
  - src/mcp/tools/decisions/schemas.ts
  - src/mcp/index.ts
parent_task_id: BACK-515
priority: medium
ordinal: 209000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add decisions domain to MCP tools. Currently there are no decision tools in MCP at all.

Tools to add (in `src/mcp/tools/decisions/`):
- `decision_list` — List all decisions with optional status/supersedes/supersededBy filters
- `decision_view` — Get full decision content
- `decision_supersede` — Supersede a decision (same semantics as CLI: create successor + mark old)

Follow existing MCP handler patterns (see `src/mcp/tools/documents/handlers.ts` for reference):
- Handler class with tool registration method
- Zod schemas for tool inputs
- Response formatted per MCP spec

Implementation plan:
1. Create `src/mcp/tools/decisions/handlers.ts` with `DecisionHandlers` class
2. Create `src/mcp/tools/decisions/schemas.ts` with Zod schemas
3. Register tools in the MCP server registration (`src/mcp/index.ts` or wherever tool registration lives)
4. Each tool mirrors the CLI command: validate → core operation → format response
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 MCP has decision_list, decision_view, decision_supersede tools
- [ ] #2 #2 All tools produce correct MCP-formatted responses
- [ ] #3 #3 Tools handle edge cases (not found, already superseded)
- [ ] #4 #4 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
