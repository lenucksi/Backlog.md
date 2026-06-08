---
id: BACK-544
title: "Sidebar: Archived Docs in Documents-Section integrieren"
status: Done
assignee: []
created_date: 2026-06-08 22:06
updated_date: 2026-06-08 22:31
labels:
  - web-ui
  - sidebar
  - docs
  - archive
dependencies: []
modified_files:
  - src/web/components/SideNavigation.tsx
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BACK-544 abgeschlossen:
- Archived Docs aus eigener CollapsibleGroup entfernt
- In Documents-Section integriert als subtile Zeile "Archived (N)" mit [+]-Toggle
- Bei Aufklappen: archivierte Docs eingerückt (ml-4) und kleinerem Font (text-xs)
- Toggle-State via localStorage-unabhängigem useState
<!-- SECTION:FINAL_SUMMARY:END -->