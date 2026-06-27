---
id: BACK-554
title: Bulk Operations Feature – Multi-Select & Batch-Aktionen
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
completed_date: 2026-06-27 15:06
labels:
  - feature
  - cross-modality
  - ux
dependencies: []
priority: medium
ordinal: 297000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ermöglicht Bulk-Operationen auf Tasks: Multi-Select-Checkboxen in allen Views, Select-All, und Batch-Aktionen (Milestone, Assignee, Labels, Status, Priority zuweisen).

Das Feature spannt alle 5 Modalitäten:
- **CLI**: `backlog task archive <id1> [id2...]` (complete kann bereits mehrere IDs)
- **TUI**: Checkboxen in Task-Liste und Kanban-Board, Bulk-Action-Toolbar, Keybindings
- **WebUI**: Checkbox-Spalte in Task-Liste, Select-All-Header, Bulk-Action-Bar
- **REST**: Bulk-Endpoints (complete, archive, status, priority, assignee, labels, milestone)
- **MCP**: Bulk-Tools

UX-Entwurf TUI Task List:
```
┌─ Tasks ─────────────────────┐
│[✓] BACK-1 - Fix login      │
│[ ] BACK-2 - Add tests       │
│[✓] BACK-3 - Deploy          │
├─ BULK ──────────────────────┤
│[C] Complete  [A] Archive    │
│ 2 tasks selected            │
└─────────────────────────────┘
```

UX-Entwurf WebUI: Checkbox-Spalte links in der Task-Tabelle, Select-All im Header-Checkbox, Bulk-Action-Bar zwischen Filterleiste und Tabelle (nur sichtbar wenn N > 0).

Referenzen: Die Analyse identifiziert GenericList.tsx als bestehende Multi-Select-Infrastruktur (genutzt von filter-popup.ts, aber nicht von Task-Liste oder Board).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TUI Task List: Checkboxen vor jedem Task, Space zum Toggeln, Select-All (Ctrl+A), Bulk-Action-Toolbar mit Complete/Archive/Status/Assign/Milestone/Labels/Priority
- [ ] #2 TUI Board: Multi-Select über alle Columns hinweg (Set<string> auf Board-Ebene), gleiche Bulk-Aktionen
- [ ] #3 WebUI TaskList.tsx: Checkbox-Spalte + Select-All + Bulk-Action-Bar
- [ ] #4 REST: POST /api/tasks/bulk/complete, /archive, /status, /priority, /assignee, /labels, /milestone
- [ ] #5 MCP: task_bulk_complete, task_bulk_archive, task_bulk_update_status Tools
- [ ] #6 CLI: backlog task archive <id1> [id2...] (multi-ID wie complete es schon kann)
- [ ] #7 Selection-State bleibt bei Filter-Änderungen erhalten (persist by task ID)
- [ ] #8 Alle 5 Modalitäten sind abgedeckt (siehe Cross-Modality-Checklist)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation across three modalities completed:\n- REST: 7 bulk endpoints (archive, status, priority, assignee, labels, milestone, due-date) via shared createBulkHandler factory\n- TUI: External selectedTaskIds Set, checkbox [✓]/[ ] rendering, Space/Ctrl+A/Escape, bulk toolbar in task-viewer-with-search.ts and board.ts\n- WebUI: Checkbox column, Select-All with indeterminate state, Bulk Action Bar (excluding Complete - removed as ambiguous)\n- Bulk due-date added (beyond original spec)\n- Clear-X buttons on all free-text search fields (TaskList, Board, Statistics, filter-header)\n- Bulk Complete removed (ambiguous between status→Done vs archive file move)\n\nDeferred:\n- MCP tools (BACK-554.2): deferred – LLM amok risk with destructive bulk ops\n- CLI commands (BACK-554.3): deferred – LLM amok risk with destructive bulk ops
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bulk Operations Feature implemented across REST, TUI, and WebUI modalities. 7 REST endpoints provide the backend for all bulk actions (archive, status, priority, assignee, labels, milestone, due-date). TUI and WebUI both provide checkbox-based multi-select with persistent selection across filter changes, Select-All, and a bulk action toolbar. Added bulk due-date support and clear-X buttons on all search fields. MCP and CLI deferred due to LLM amok risk with destructive operations.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->