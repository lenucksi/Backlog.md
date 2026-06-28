---
id: BACK-0580
title: "web-ui sidebar: decision ID anzeigen + Sortierung für Decisions (analog
  zu BACK-558)"
status: Done
assignee: []
created_date: 2026-06-26 18:17
updated_date: 2026-06-26 18:40
labels:
  - enhancement
  - web-ui
milestone: m-8
dependencies: []
modified_files:
  - src/web/components/SideNavigation.tsx
priority: low
ordinal: 332000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gleiches Feature wie BACK-558 für docs, jetzt auch für Decisions:
1. Decision-ID (ohne decision- Prefix) in kleiner grauer Monospace-Schrift rechts neben dem Icon in jedem Decisions-Sidebar-Eintrag anzeigen
2. Sortierungs-Auswähler (#, Name, Datum) im Decisions-Header + ▲/▼-Toggle
3. Standard-Sortierung nach Titel (asc) — identisch zum aktuellen Verhalten
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision-ID (ohne Prefix) in jedem Decisions-Sidebar-Eintrag rechts neben dem Icon in kleiner grauer Monospace-Schrift sichtbar
- [ ] #2 Sortierungs-Auswähler (#, Name, Datum) im Decisions-Header + ▲/▼-Button
- [ ] #3 Standard-Sortierung ist alphabetisch nach Titel (asc)
- [ ] #4 Konsistenter spacing (space-x-1.5) im Decisions-NavLink wie bei Docs
- [ ] #5 Superceded-Decisions haben ebenfalls die ID-Anzeige
- [ ] #6 TypeScript + Lint + Tests passieren
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 Feature implemented in WebUI (sidebar only — other modalities N/A)
<!-- DOD:END -->