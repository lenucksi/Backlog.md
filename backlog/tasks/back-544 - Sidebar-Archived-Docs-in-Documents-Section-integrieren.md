---
id: BACK-544
title: "Sidebar: Archived Docs in Documents-Section integrieren"
status: To Do
assignee: []
created_date: 2026-06-08 22:06
labels:
  - web-ui
  - sidebar
  - docs
  - archive
dependencies: []
priority: low
ordinal: 279000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Archived Docs hat aktuell eine eigene CollapsibleGroup nach Decisions, mit Trennlinie.

Ziel:
- Archived Docs direkt in die Documents-Section integrieren
- Als kleinere, grauere Zeile am Ende der Documents (nach "+ Create")
- "+" Uncollapse-Button zeigt archivierte Docs eingerückt an
- Oder alternativ: direkt unter den Documents, mit gleichem CollapsibleGroup-Stil aber kleinerem Font
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->