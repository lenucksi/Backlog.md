---
id: BACK-555.3
title: "[Search] MCP – titleContains in Task Search Schema"
status: Done
assignee: []
created_date: 2026-06-09 12:56
updated_date: 2026-06-27 09:39
completed_date: 2026-06-27 09:39
labels:
  - superseded
  - feature
  - mcp
dependencies: []
parent_task_id: BACK-555
priority: low
ordinal: 306000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Erweitert das MCP task_search Tool um einen `titleContains` Parameter für substring-basierte Titel-Suche.

**src/mcp/tools/tasks/schemas.ts:**
- `taskSearchSchema` um `titleContains: { type: "string" }` erweitern

**src/mcp/tools/tasks/handlers.ts:**
- In `searchTasks()`: wenn `titleContains` gesetzt, zusätzlich `task.title.toLowerCase().includes(titleContains.toLowerCase())` anwenden
- Der Filter ist additiv zum bestehenden Fuse.js search query (AND-Verknüpfung)

**src/utils/task-search.ts (geteilt):**
- `TaskSearchOptions` hat bereits `titleSubstring` aus dem TUI-Subtask – MCP nutzt die gleiche Utility

**Dependency:** Setzt die `titleSubstring` Option in task-search.ts voraus (aus dem TUI-Subtask). Kann auch eigenständig implementiert werden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 taskSearchSchema hat titleContains: { type: 'string' } Feld
- [ ] #2 searchTasks() wendet titleContains als case-insensitive substring match auf task.title an
- [ ] #3 titleContains ist additiv zu bestehenden Fuse.js search queries (AND)
- [ ] #4 titleContains funktioniert auch ohne query (alleinstehend)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nicht implementiert – Parent BACK-555 erwies sich als überflüssig.

MCP task_search nutzt den gleichen `createTaskSearchIndex()` aus src/utils/task-search.ts mit Fuse.js (ignoreLocation: true, threshold: 0.35). Das matched bereits substring auf Titel. Ein `titleContains`-Parameter im Schema wäre zusätzlicher Schema-Bloat ohne Nutzen, da `query` denselben Effekt hat.

Referenz: Discovery-Log in BACK-555.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Nicht nötig – Fuse.js query matched bereits substring auf Titel. titleContains-Parameter wäre Schema-Bloat ohne Nutzen.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->