---
id: BACK-0610
title: Frontend CSS Pattern Fixes — size-*, gap-*, rounded-circle, htmlFor
status: To Do
assignee: []
created_date: 2026-06-28 18:21
labels:
  - refactoring
  - tech-debt
  - frontend
  - css
milestone: m-15
dependencies: []
priority: low
ordinal: 400000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vier kleinere CSS-Pattern-Verbesserungen aus dem Frontend-Audit: 1) ~50 Stellen w-* h-* → size-* (Icons, Avatare, Spinner), 2) ~47 Stellen space-x-* auf flex-containern → gap-*, 3) rounded-full → rounded-circle (7 Stellen, respektiert Theme-Variable), 4) ~15 Labels ohne htmlFor mit Input verknüpfen.

Siehe AGENTS.md WebUI Conventions: 'size-* statt w-* h-* bei gleicher Breite/Höhe' und 'gap-* statt space-x-*.'
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle w-4 h-4 → size-4 (etc.) in src/web/components/
- [ ] #2 space-x-* auf flex-containern → gap-*
- [ ] #3 rounded-full auf runden Elementen → rounded-circle
- [ ] #4 Labels mit htmlFor an Inputs gebunden
- [ ] #5 bun run check . passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->