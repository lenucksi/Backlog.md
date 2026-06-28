---
id: BACK-0604
title: Refactor Web-Komponenten — TaskList (1.289) + TaskDetailsModal (1.277)
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - refactoring
  - tech-debt
  - large-file
  - webui
milestone: m-15
dependencies: []
priority: high
ordinal: 387000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zwei WebUI-Komponenten über 1.200 Zeilen: TaskList.tsx mischt Filter-UI, Tabellen-Rendering, Bulk-Selection, Sortierung. TaskDetailsModal.tsx mischt Preview/Edit/Create-Modus, Markdown-Editor, Acceptance-Criteria-Manager, Dependency-Manager, API-Calls.

Ziel: In Hooks + Subkomponenten zerlegen (useTaskFilters, TaskTableRow, useBulkSelection, useSortableColumns — und für TaskDetails: TaskMetadataFields, TaskContentSection, useTaskSave).

Siehe subagent-reports/sonarlint-large-file-analysis.md Section 2f und 2g
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Alle Sub-Tasks erledigt
- [ ] #2 TaskList.tsx ≤ 600 Zeilen
- [ ] #3 TaskDetailsModal.tsx ≤ 600 Zeilen
- [ ] #4 bun run check . passes
- [ ] #5 Bun test passes
- [ ] #6 WebUI funktioniert (manuell prüfen)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
TaskList.tsx Extractions:
1. useTaskFilters hook — filter state aus URL params + local state
2. TaskTableRow component — einzelne Zeile rendern
3. useBulkSelection hook — checkbox state + select all
4. useSortableColumns hook — sort state + toggle

TaskDetailsModal.tsx Extractions:
1. TaskMetadataFields — labels, milestone, priority, assignee felder
2. TaskContentSection — description, plan, notes, summary Markdown-Editoren
3. useTaskSave hook — save/update/archive logic + loading state
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Die WebUI-Komponenten sind weniger stark strukturiert als die TUI-Komponenten. Keine God-Functions sondern viele useState/useEffect Hooks. Die Extraktion erfordert mehr Analyse als reines copy-paste.

Beide Komponenten haben 20+ useState — das ist der Hauptkandidat für Extraktion in Custom Hooks.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->