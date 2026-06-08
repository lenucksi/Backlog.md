---
id: BACK-486.4
title: BACK-486.4 — Author Color Display (WebUI)
status: In Progress
assignee: []
created_date: 2026-06-08 18:00
updated_date: 2026-06-08 18:52
labels:
  - authors
  - web-ui
  - color
dependencies: []
parent_task_id: BACK-486
priority: medium
ordinal: 275000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Beschreibung

Author-Farben in TaskCard Assignee-Badge, ChipInput Farb-Dots, Autocomplete mit Config-Preferenz.

Abhängigkeit: BACK-486.3 (Author CRUD muss existieren)

### Änderungen

1. **src/web/components/TaskCard.tsx** — Assignee-Badge mit Author-Farbe:
   - Wenn assignee in `config.authors` → Badge mit `backgroundColor: author.color`
   - Fallback zu grau

2. **src/web/components/ChipInput.tsx** — `colorMap`-Prop erweitern:
   - Auch für assignee-ChipInput (Farb-Dots neben Author-Namen)
   - `colorMap` aus `availableAuthors` + `availableAssignees`

3. **src/web/components/TaskDetailsModal.tsx**:
   - Assignee-ChipInput mit `colorMap` aus Authors
   - Parent-Task-ChipInput optional

4. **src/web/App.tsx** — `availableAuthors` laden und an Komponenten weitergeben
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->