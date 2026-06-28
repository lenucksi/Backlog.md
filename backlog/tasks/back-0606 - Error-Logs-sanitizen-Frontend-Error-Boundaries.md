---
id: BACK-0606
title: Error Logs sanitizen + Frontend Error Boundaries
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - hygiene
  - refactoring
  - tech-debt
  - frontend
milestone: m-15
dependencies: []
priority: medium
ordinal: 389000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zwei Themen: 1) Error-Messages leaken Error-Objekte mit Stacktraces in console.error (config.ts, init.ts, overview.ts, agents.ts, handlers/tasks.ts — ~15 Stellen). Auf err.message reduzieren. 2) Nur 3 von ~12 Page-Komponenten haben ErrorBoundary — TaskList, Board, Settings, MilestonesPage, DraftsList, TaskDetailsModal, CleanupModal, Statistics haben keinen. Ein Crash reißt die ganze App.

Hygiene-Audit: subagent-reports/sonarlint-large-file-analysis.md Hygiene Section 2 (error leaks) + Frontend-Audit Section 5.3 (error boundaries)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Kein console.error(... , err) mehr — nur err.message
- [ ] #2 Error Boundaries in App.tsx, TaskList, Board, Settings, MilestonesPage, DraftsList
- [ ] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Error Logs: Alle `console.error("...", error)` → `console.error("...", error instanceof Error ? error.message : String(error))`. Betrifft: src/commands/config.ts (3x), init.ts, overview.ts, agents.ts, browser.ts, src/server/handlers/tasks.ts (8x).
2. Error Boundaries: Einen shared ErrorBoundary React Component erstellen (falls nicht vorhanden) oder bestehenden (src/web/components/ErrorBoundary.tsx) nutzen. In App.tsx, TaskList.tsx, Board.tsx, Settings.tsx, MilestonesPage.tsx, DraftsList.tsx wrappen.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Die Error-Boundary-Datei existiert bereits (ErrorBoundary.tsx) — wird aber nur in SideNavigation, DecisionDetail, DocumentationDetail genutzt. Einfach importieren und wrappen.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->