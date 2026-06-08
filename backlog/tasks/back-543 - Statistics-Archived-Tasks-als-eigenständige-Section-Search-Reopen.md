---
id: BACK-543
title: "Statistics: Archived Tasks als eigenständige Section + Search + Reopen"
status: Done
assignee: []
created_date: 2026-06-08 22:06
updated_date: 2026-06-08 22:28
labels:
  - web-ui
  - statistics
  - archive
  - search
dependencies: []
modified_files:
  - src/web/components/Statistics.tsx
  - src/web/components/SideNavigation.tsx
  - src/web/components/CollapsibleGroup.tsx
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BACK-543 abgeschlossen:
- Archived Tasks aus Project Health rausgezogen → eigene Section auf gleicher Ebene
- Volltext-Suche nach Title/ID
- Alle archived Tasks angezeigt (kein "+N more")
- Reopen-Button pro Task (ruft apiClient.reopenTask + refresh statistics)
- Completed(N) in SideNav → Link zu /statistics#archived mit smooth scroll
- CollapsibleGroup um optionales to-Prop erweitert
<!-- SECTION:FINAL_SUMMARY:END -->