---
id: BACK-0587
title: "web-ui sidebar: user-resizable width + kein horizontales Scrollen beim Start"
status: Done
assignee: []
created_date: 2026-06-27 15:28
updated_date: 2026-06-27 15:28
labels:
  - web-ui
  - sidebar
  - ux
dependencies: []
modified_files:
  - src/web/components/SideNavigation.tsx
priority: low
ordinal: 344000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Die Sidebar scrollte horizontal durch die fixe Breite von 320px (w-80). Änderungen:

- Sidebar-Breite via Drag-to-Resize vom Nutzer einstellbar (240–600px, Default 380px)
- Persistierung in localStorage (sideNavWidth)
- CSS-Transition wird während Resize deaktiviert (transition-none), damit der Drag nicht laggt
- overflow-x-hidden auf dem nav-Element verhindert horizontales Scrollen
- collapse/expand nutzt weiterhin transition für smooth animation
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [x] #5 Biome Check passed (bun run check .)
- [x] #6 Feature in WebUI implementiert (N/A für CLI/TUI/MCP/REST – reines Web-Feature)
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sidebar lässt sich per Drag am rechten Rand in der Breite verstellen (240–600px)
- [x] #2 Default-Breite 380px – kein horizontales Scrollen beim Start
- [x] #3 Breite wird in localStorage persistiert (sideNavWidth)
- [x] #4 CSS-Transition wird während Resize deaktiviert, um Lag zu vermeiden
- [x] #5 overflow-x-hidden verhindert horizontales Scrollen im nav-Bereich
- [x] #6 Collapse/Expand funktioniert weiterhin mit smooth animation
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Sidebar in der WebUI war auf fixe 320px (w-80) begrenzt, was bei längeren Titeln horizontales Scrollen verursachte.

Geändert:
- `w-80 min-w-80` durch dynamische Breite per `sidebarWidth`-State ersetzt
- Drag-to-Resize-Handle am rechten Rand: mousedown setzt body user-select/cursor, mousemove aktualisiert Breite + localStorage, mouseup räumt auf
- Default 380px (breit genug für typische Titel ohne Scrollen)
- Clamping auf 240–600px
- `transition-none` während Resize (verhindert Lag)
- `overflow-x-hidden` auf `<nav>` als zusätzliche Absicherung
- Breite in localStorage unter `sideNavWidth` persistiert

Keine Änderungen an Layout.tsx nötig (flex-1 passt sich automatisch an).
Biome Check: clean.
<!-- SECTION:FINAL_SUMMARY:END -->