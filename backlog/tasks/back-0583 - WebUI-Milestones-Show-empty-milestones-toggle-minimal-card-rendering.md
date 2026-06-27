---
id: BACK-0583
title: 'WebUI Milestones: "Show empty milestones" toggle + minimal card rendering'
status: Done
assignee: []
created_date: 2026-06-27 08:33
updated_date: 2026-06-27 09:19
completed_date: 2026-06-27 08:35
labels:
  - webui
  - milestones
  - enhancement
dependencies: []
modified_files:
  - src/web/components/MilestonesPage.tsx
priority: low
ordinal: 340000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Leere Milestones (existieren als milestone-Files aber haben 0 Tasks) werden in der Milestones-Seite nicht angezeigt. Es gibt keinen Weg sie zu sehen, zu editieren oder zu löschen.

## Requirement
- "Show empty milestones" Checkbox/Toggle in der Milestones-Übersicht
- Wenn aktiv: leere Milestones als minimale Karte anzeigen (Titel + No tasks + Edit/Archive-Buttons, kein Progress-Bar)
- Wenn inaktiv: leere Milestones verstecken (current behavior)
- Empty-Karten sollen editierbar und archivierbar sein (geht bereits via vorhandener Edit/Archive-Buttons)

## Files
- `src/web/components/MilestonesPage.tsx`

## Complexity
TRIVIAL — neuer State + Filter + Toggle im UI
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Show empty milestones checkbox exists in milestone view
- [x] #2 When checked, milestones with 0 tasks are displayed as minimal cards
- [x] #3 When unchecked, empty milestones are hidden
- [x] #4 Empty milestone cards show edit/archive buttons
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
**Bugfix** (2026-06-27): Zwei Bugs nach Implementierung gefixt:
1. `useMemo`-Dependency-Array fehlte `showEmptyMilestones` → Checkbox-umschalten hatte keinen Effekt
2. Remove-Empty-Milestone-Dialog zeigte fälschlich Reassign-Optionen → jetzt einfacher Confirm-Text ohne Task-Handling-Radios
<!-- SECTION:FINAL_SUMMARY:END -->