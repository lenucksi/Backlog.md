---
id: BACK-540.5
title: BACK-540.5 — Tests (~40 tsc-Fehler)
status: To Do
assignee: []
created_date: 2026-06-08 13:28
labels:
  - tech-debt
  - tests
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 269000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 5 des tsc-Cleanups. ~40 tsc-Fehler in Testdateien beheben.

## Betroffene Dateien
- src/test/commands-config-cov.test.ts (16× Array-Typ `{key:string}[]` → `string[]`)
- src/test/assignee.test.ts (3× toEqual/null Typen)
- src/test/backlog-coverage.test.ts (1× newIndex existiert nicht in reorderTask params)
- src/test/task-watcher.test.ts (2× WatchListener/instanceof Typen)
- src/test/commands-test-helper.ts (3× unused, possibly null, readonly)
- src/test/content-store-comprehensive.test.ts (2× unused _prefix)
- src/test/core.test.ts (1× modifiedFiles in TaskListFilter)
- src/test/cross-branch-tasks.test.ts (1× possibly undefined)
- src/test/mcp-server-cov.test.ts (1× unused _prefix)
- src/test/reorder-coverage.test.ts (1× overload)
- src/test/sequences-comprehensive.test.ts (2× unused, undefined assignment)
- src/test/task-loader-*.test.ts (7× BranchTaskStateEntry, possibly undefined)
- src/test/termless-helper.ts (1× expect not found)
- src/test/vterm-backend.ts (1× string vs boolean)
- src/test/zz-*.test.ts (viele coverage tests)

Abhängigkeiten: BACK-540.4
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->