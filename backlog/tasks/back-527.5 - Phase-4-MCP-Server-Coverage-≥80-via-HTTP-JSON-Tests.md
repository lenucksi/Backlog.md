---
id: BACK-527.5
title: 'Phase 4: MCP + Server Coverage ≥80% via HTTP/JSON Tests'
status: Done
assignee: []
created_date: '2026-05-22 14:30'
updated_date: '2026-05-22 14:43'
labels:
  - testing
  - coverage
  - phase-4
  - mcp
  - server
  - back-527
dependencies: []
parent_task_id: BACK-527
priority: high
ordinal: 239000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coverage für 5 MCP/Server-Files auf ≥80% bringen. Nutzt existierende Server-Test-Patterns (Server auf random Port starten, HTTP-Requests senden).

## Files

1. **src/mcp/server.ts** (533 lines) — MCP Server (JSON-RPC über stdio/SSE)
2. **src/mcp/tools/tasks/handlers.ts** (442 lines) — MCP Task handlers
3. **src/mcp/tools/milestones/handlers.ts** (533 lines) — MCP Milestone handlers
4. **src/server/handlers/tasks.ts** (417 lines) — WebUI Task HTTP endpoints
5. **src/server/index.ts** (321 lines) — WebUI Server startup

## Methode

Für MCP:
- Starte Server via `bun src/cli.ts mcp start` oder direkten Import
- Sende JSON-RPC Requests via stdio
- Validiere Responses

Für Server/WebUI:
- Starte Server auf random Port
- Sende HTTP Requests
- Nutze bestehende Patterns aus `src/test/server-assets.test.ts` oder `src/test/mcp-server.test.ts`

## Referenzen
- doc-7: Terminal Test Strategie
- doc-8: Termless Analysis Report
- src/test/server-assets.test.ts: Server startup/shutdown Pattern
- src/test/mcp-server.test.ts: MCP stdio Pattern
- src/test/termless-helper.ts: term() Convenience Wrapper

## Labels
testing, coverage, phase-4, mcp, server, back-527
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/mcp/server.ts ≥80% (99.31%)
- [ ] #2 src/mcp/tools/tasks/handlers.ts ≥80% (92.36%)
- [ ] #3 src/mcp/tools/milestones/handlers.ts ≥80% (97.77%)
- [ ] #4 src/server/handlers/tasks.ts ≥80% (84.08%)
- [ ] #5 src/server/index.ts ≥80% (83.61%)
<!-- AC:END -->
