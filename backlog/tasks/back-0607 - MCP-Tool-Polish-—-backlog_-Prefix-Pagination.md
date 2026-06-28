---
id: BACK-0607
title: MCP Tool Polish — backlog_ Prefix + Pagination
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - mcp
  - refactoring
  - tech-debt
milestone: m-15
dependencies: []
priority: low
ordinal: 390000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zwei Verbesserungen an den MCP Tools: 1) Tool-Namen haben keinen backlog_ Prefix — in Multi-MCP-Workspaces können Namen wie task_list, label_list mit anderen Servern kollidieren. Prefix auf backlog_task_list, backlog_label_list etc. ändern. 2) MCP List-Tools haben keine Pagination — task_list, author_list, label_list, decision_list, document_list, milestone_list geben alle Ergebnisse auf einmal zurück. limit/offset Parameter ergänzen.

MCP-Audit: subagent-reports/sonarlint-large-file-analysis.md MCP Section
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle MCP Tool-Namen haben backlog_ Prefix
- [ ] #2 task_list + document_list + milestone_list + decision_list + label_list + author_list unterstützen limit/offset
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Prefix: In src/mcp/tools/*/index.ts — jeden tool name von `task_list` zu `backlog_task_list` ändern. Alle ~20 Tools. Danach die Client-Seite prüfen falls der alte Name irgendwo referenziert wird (`rg "task_list|label_list" src/`).
2. Pagination: In src/mcp/tools/*/schemas.ts — limit/offset Optionen ergänzen. In den Handlern die Query-Parameter an die interne query/list Methode durchreichen. Betrifft: task_list, document_list, milestone_list, decision_list, label_list, author_list.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prefix-Änderung bricht alle existierenden MCP-Clients! Die Clients müssen den neuen Namen verwenden. In der Release-Notification dokumentieren.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->