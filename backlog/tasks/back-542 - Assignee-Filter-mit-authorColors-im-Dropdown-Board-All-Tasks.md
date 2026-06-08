---
id: BACK-542
title: Assignee-Filter mit authorColors im Dropdown (Board + All Tasks)
status: Done
assignee: []
created_date: 2026-06-08 22:06
updated_date: 2026-06-08 22:09
labels:
  - web-ui
  - ui
  - filter
  - authors
  - color
dependencies: []
modified_files:
  - src/web/components/LabelFilterDropdown.tsx
  - src/web/components/Board.tsx
  - src/web/components/TaskList.tsx
priority: medium
ordinal: 277000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Das native `<select>` für Assignee-Filter in Board und All Tasks zeigt keine Author-Farben. authorColors existieren bereits in App.tsx und werden an Board/TaskList gereicht, aber das `<select>` kann keine Farb-Dots rendern.

Fix: FilterSelect-Komponente bauen oder LabelFilterDropdown um singleSelect + colorMap erweitern, sodass assignees mit Farb-Dots angezeigt werden. Board + TaskList migrieren.
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
LabelFilterDropdown um singleSelect-Modus + title-Prop erweitert. Natives `<select>` für Assignee-Filter in Board.tsx und TaskList.tsx durch LabelFilterDropdown singleSelect mit authorColors als colorMap ersetzt.
<!-- SECTION:FINAL_SUMMARY:END -->