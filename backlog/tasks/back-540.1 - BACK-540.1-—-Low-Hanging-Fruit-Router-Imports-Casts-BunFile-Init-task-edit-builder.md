---
id: BACK-540.1
title: BACK-540.1 — Low Hanging Fruit (Router, Imports, Casts, BunFile, Init,
  task-edit-builder)
status: Done
assignee: []
created_date: 2026-06-08 13:27
updated_date: 2026-06-08 13:36
labels:
  - tech-debt
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 265000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 1 des tsc-Cleanups. ~10 tsc-Fehler in src/ beheben.

## Änderungen

1. **src/server/router.ts** – `RouteHandlers.config` um `handleAddLabel`, `handleRenameLabel`, `handleRemoveLabel` ergänzen
2. **src/mcp/tools/labels/schemas.ts:1** – Import `../../types.ts` → `../../validation/validators.ts`
3. **src/mcp/tools/labels/index.ts:30,41,52** – Casts `as unknown as LabelAddArgs` etc.
4. **src/server/index.ts:287,302** – `import type { BunFile } from "bun"` ergänzen
5. **src/core/init.ts:150-151** – Duplikate (`statuses`, `labels`) entfernen
6. **src/core/init.ts:257** – `resolveConfigLocation` Return-Type fixen: `string` → `"folder" | "root"`
7. **src/utils/task-edit-builder.ts:26** – `checked: false` → `checked: boolean`

Abhängigkeiten: Keine
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Phase 1 abgeschlossen: src-Fehler von 59 auf 35 reduziert. 
Gefixt: router.ts RouteHandlers (3 Methoden), schemas.ts Import, index.ts casts (3x as unknown as), server/index.ts BunFile Import, init.ts duplicates + return type, task-edit-builder.ts checked type, server/index.ts:164 handler signature mismatch (rename + remove nehmen Request & { params: { name: string } })
<!-- SECTION:NOTES:END -->