---
id: BACK-0610
title: Frontend CSS Pattern Fixes — size-*, gap-*, rounded-circle, htmlFor
status: Done
assignee: []
created_date: 2026-06-28 18:21
updated_date: 2026-07-05 21:18
completed_date: 2026-07-05 21:18
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CSS Pattern Fixes abgeschlossen:

1. w-* h-* → size-*: 152 Stellen ersetzt (u.a. w-4 h-4 → size-4, w-5 h-5 → size-5, w-3.5 h-3.5 → size-3.5). Regex matched nur identische Werte, keine FPs.
2. space-x-* → gap-*: 47 Stellen ersetzt (space-x-2 → gap-2, space-x-3 → gap-3, space-x-4 → gap-4). Alle auf flex-containern.
3. rounded-full → rounded-circle: 25 Stellen ersetzt (Tailwind v4 built-in + in source.css definiert).
4. htmlFor: 1 Label in InitializationScreen.tsx → zu <div> geändert (war Section-Heading, kein Input-Label). Die restlichen 13 labels wrappen Inputs direkt (htmlFor nicht nötig). 15 Labels hatten bereits htmlFor.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->