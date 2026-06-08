---
id: BACK-540.4
title: BACK-540.4 — Sonstige src/-Fehler
status: To Do
assignee: []
created_date: 2026-06-08 13:28
labels:
  - tech-debt
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 268000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 4 des tsc-Cleanups. ~7 verbleibende tsc-Fehler in src/ beheben.

## Änderungen

1. **src/core/backlog.ts:2484** – Computed spread `{}` → `title: existingDecision.title` 
2. **src/server/utils.ts:201,210** – `Array.isArray`-Guards für `string | string[]`
3. **src/file-system/operations.ts:118,135** – `Object is possibly 'undefined'` → optional chaining
4. **src/web/App.tsx:647** – `DocumentationDetailProps & DecisionDetailProps` Props-Union fixen
5. **src/web/components/TaskColumn.tsx:40** – `draggedTaskId` → `_draggedTaskId` (unused)
6. **src/web/components/TaskDetailsModal.tsx:685,704** – `onNavigateToTask` scoping

Abhängigkeiten: BACK-540.3
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->