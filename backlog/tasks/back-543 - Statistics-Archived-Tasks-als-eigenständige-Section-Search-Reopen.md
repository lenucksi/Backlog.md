---
id: BACK-543
title: "Statistics: Archived Tasks als eigenständige Section + Search + Reopen"
status: To Do
assignee: []
created_date: 2026-06-08 22:06
labels:
  - web-ui
  - statistics
  - archive
  - search
dependencies: []
priority: medium
ordinal: 278000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Archived Tasks sind aktuell in Project Health eingebettet mit "+N more archived tasks" als statischem Text.

Ziel:
- Archived Tasks als eigene Section auf gleicher Ebene wie Project Health
- Alle archived Tasks anzeigen (kein "+N more")
- Volltext-Suche nach ID/Title
- Reopen-Button per Task
- "Completed (N)" in SideNav → Link zu /statistics mit Scroll zu Archived Section
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->