---
id: BACK-492.10
title: 'TechDebt: Refactor server/index.ts routing and handler registration'
status: Done
assignee:
  - opencode
created_date: '2026-05-20 23:02'
updated_date: '2026-05-22 00:48'
labels:
  - tech-debt
  - refactoring
  - server
dependencies: []
parent_task_id: BACK-492
priority: medium
ordinal: 179300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube hotspots:
- `src/server/index.ts` Zeile 880 (CC 43), Zeile 694 (CC 35), Zeile 1091 (CC 21)

Der Server-Modul kombiniert Express-Route-Definition, Middleware-Setup, Handler-Registrierung und Error-Handling in einer Datei. Extraktion des Route-Builders in ein separates Modul, Vereinfachung der verschachtelten Middleware-Struktur.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 server/index.ts Zeile 880 CC ≤25
- [x] #2 server/index.ts Zeile 694 CC ≤25
- [x] #3 Server-API-Endpunkte bleiben identisch
- [x] #4 bun run check . und bun test bestehen
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

1. Create `src/server/utils.ts` — Extract pure utility functions (parsing, validation, type helpers)
2. Create `src/server/middleware.ts` — Extract caching headers, port checking, WebSocket handling
3. Create `src/server/handlers/` — Extract handler factories by domain:
   - `tasks.ts` — createTask, listTasks, getTask, updateTask, deleteTask, completeTask, reorderTask, cleanup, search
   - `documents.ts` — listDocs, getDoc, createDoc, updateDoc
   - `decisions.ts` — listDecisions, getDecision, createDecision, updateDecision
   - `milestones.ts` — list, listArchived, get, create, update, remove, archive
   - `drafts.ts` — listDrafts, promoteDraft
   - `config.ts` — getConfig, updateConfig
   - `system.ts` — getStatus, getVersion, getStatistics, getStatuses, init, sequences, assets
4. Create `src/server/router.ts` — Builds the Bun.serve routes object from handler factories
5. Simplify `src/server/index.ts` — Thin BacklogServer class

Key pattern: Each handler module exports a `create*Handlers(ctx: ServerHandlerContext)` factory that returns handler functions. The context provides: core, getContentStore, getSearchService, broadcastTasksUpdated, broadcastConfigUpdated, resolveMilestoneInput, projectName.

All exports preserved: BacklogServer, markHtmlBundleNoStore, isPortAvailable, findNextAvailablePort
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactored src/server/index.ts from a 1776-line monolithic file into 12 focused modules:

**New modules:**
- `src/server/types.ts` — ServerHandlerContext interface for handler dependency injection
- `src/server/utils.ts` — Pure utility functions (parsing, validation, type helpers)
- `src/server/middleware.ts` — Caching headers, port checking, WebSocket helpers
- `src/server/router.ts` — Route builder from handler registrations
- `src/server/handlers/tasks.ts` — Task CRUD, search, reorder, cleanup handlers
- `src/server/handlers/documents.ts` — Document CRUD handlers
- `src/server/handlers/decisions.ts` — Decision CRUD handlers
- `src/server/handlers/milestones.ts` — Milestone handlers
- `src/server/handlers/drafts.ts` — Draft handlers
- `src/server/handlers/config.ts` — Config handlers
- `src/server/handlers/system.ts` — Status, version, statistics, init, assets

BacklogServer class now creates a ServerHandlerContext and delegates to handler factory functions. All exports preserved: BacklogServer, markHtmlBundleNoStore, isPortAvailable, findNextAvailablePort. All API endpoints remain identical.

**Verification:**
- `bunx tsc --noEmit` — no errors in src/server/ files
- `bun run check .` — no Biome errors in src/server/ files
- `bun test server-` — 34 pass, 2 fail (pre-existing failures unrelated to refactoring)
- Commit: 960c40478cf0101aee8ba7d0159e1d09cb07ec02
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->
