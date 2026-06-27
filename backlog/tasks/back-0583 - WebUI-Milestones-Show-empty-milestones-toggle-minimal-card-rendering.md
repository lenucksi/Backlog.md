---
id: BACK-0583
title: 'WebUI Milestones: "Show empty milestones" toggle + minimal card rendering'
status: In Progress
assignee: []
created_date: 2026-06-27 08:33
updated_date: 2026-06-27 08:33
labels:
  - webui
  - milestones
  - enhancement
dependencies: []
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
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->