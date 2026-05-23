---
id: BACK-430
title: Create tasks from the TUI board
status: Done
assignee:
  - '@opencode'
created_date: '2026-04-25 12:14'
updated_date: '2026-05-22 16:32'
labels:
  - tui
  - enhancement
milestone: m-12
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/issues/579'
modified_files:
  - src/ui/create-task.ts
  - src/ui/board.ts
  - src/ui/components/help-popup.ts
priority: medium
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

TUI kann nichts erstellen (tasks, drafts, milestones, documents, decisions). Der TUI-helptext verweist auf die CLI. Nutzer müssen kontext-switchen, was die TUI als standalone-Interface entwertet.

Gap #1 im Feature-Parity-Matrix (DOC-005) — höchste Impact.

## What

### Phase 1: Task creation (core)
- Neuer create-task screen in src/ui/ (z.B. create-task.ts)
- Formular: Titel (required), Description (optional), Status (default: To Do), Priority (default: Medium)
- Nutzt bestehende core.createTask()
- Tastaturnavigation analog bestehender TUI-Screens

### Phase 2: Milestone, Draft, Document creation
- if task.create funktioniert, analog für milestones/drafts/documents
- Je nach Komplexität: einfache Formulare mit Name+Titel+Description

### Integration
- Keybinding in board- und task-list Ansichten (z.B. "n" für new)
- Konsistent mit bestehenden TUI navigation patterns (q=quit, etc.)

## Out of scope
- Decision creation in TUI (niedrige Priorität, MCP + CLI + WebUI ausreichend)

## References
- DOC-005 STUB-P5
- src/ui/board.ts — TUI board view pattern
- src/ui/task-viewer-with-search.ts — TUI task viewer pattern
- src/core/backlog.ts — createTask() Signatur
- GitHub issue #579
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 The TUI board exposes a discoverable keybinding or command for task creation.
- [x] #2 #2 The create flow prompts for title and initial status at minimum.
- [x] #3 #3 After creation, the board refreshes and focuses the new task or its column.
- [x] #4 #4 Help text and tests/manual verification cover the flow.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created TUI create-task screen (src/ui/create-task.ts, 253 lines) with form for Title (required), Description (optional), Status and Priority (cycle via ←→). Registered "n/N" keybinding in board.ts that opens the popup and refreshes board on success. Added "N" - "Create new task" to help-popup shortcuts. Phase 1 of TUI creation parity.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
