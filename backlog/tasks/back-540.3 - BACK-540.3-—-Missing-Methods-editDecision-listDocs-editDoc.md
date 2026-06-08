---
id: BACK-540.3
title: BACK-540.3 — Missing Methods (editDecision, listDocs, editDoc)
status: To Do
assignee: []
created_date: 2026-06-08 13:28
labels:
  - tech-debt
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 267000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 3 des tsc-Cleanups. Feature-Gap schließen – Runtime-Funktionalität herstellen.

## Änderungen

1. **src/core/backlog.ts** – `editDecision(id, updates)` hinzufügen:
   Entscheidung laden → labels mergen → `updateDecisionFromContent()` aufrufen

2. **listDocs() → listDocuments()** in allen Callern:
   - src/mcp/tools/labels/handlers.ts:90
   - src/server/handlers/config.ts:129

3. **editDoc() → updateDocumentFromInput()** + content mitgeben:
   - src/mcp/tools/labels/handlers.ts:94
   - src/server/handlers/config.ts:133

4. **src/commands/label.ts:148** – `DocumentUpdateInput.content` ist required.
   Entweder optional machen in types/index.ts ODER Content laden und mitgeben.

5. **src/commands/label.ts:156** – `editDecision` verwenden (implementiert in Schritt 1)

Abhängigkeiten: BACK-540.2
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->