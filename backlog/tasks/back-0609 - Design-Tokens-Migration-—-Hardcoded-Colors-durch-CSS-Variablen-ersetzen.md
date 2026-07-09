---
id: BACK-0609
title: Design Tokens Migration — Hardcoded Colors durch CSS-Variablen ersetzen
status: To Do
assignee: []
created_date: 2026-06-28 18:21
updated_date: 2026-07-05 19:58
labels:
  - refactoring
  - tech-debt
  - frontend
  - design-tokens
milestone: m-15
dependencies: []
priority: low
ordinal: 399000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Das Frontend hardcodiert Tailwind-Farbklassen in JEDER Komponente: text-gray-900 dark:text-gray-100, bg-white dark:bg-gray-800, bg-blue-500, focus:ring-blue-500. Stattdessen CSS-Variable-basierte Tokens: text-foreground, bg-background, bg-primary, ring-ring.

Dies betrifft ALLE WebUI-Komponenten (~20 Dateien). Ist der größte Einzel-Refactoring im Frontend.

Subtasks:
- 0609.01 Core Tokens: Text-Farben (text-gray-900 → text-foreground, etc.)
- 0609.02 Core Tokens: Background-Farben (bg-white → bg-background, etc.)
- 0609.03 Core Tokens: Primary/Action (bg-blue-500 → bg-primary, etc.)
- 0609.04 Component-spezifische Tokens (border-gray-200 → border-border, etc.)

Siehe AGENTS.md → WebUI Conventions: 'bg-background, text-foreground, text-muted-foreground, bg-primary. Keine raw-Farben wie bg-blue-500, text-white.'
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle 4 Subtasks (0609.01-.04) erledigt
- [ ] #2 Kein text-gray-900/100 oder bg-white/gray-800 mehr in src/web/components/
- [ ] #3 Kein focus:ring-blue-* mehr — stattdessen ring-ring
- [ ] #4 bg-blue-500/600 durch bg-primary ersetzt
- [ ] #5 Keine raw-Farben ohne Token-Äquivalent
- [ ] #6 bun run check . passes
- [ ] #7 Vite build passes
- [ ] #8 WebUI funktioniert in light + dark mode (manuell)
<!-- AC:END -->



## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->