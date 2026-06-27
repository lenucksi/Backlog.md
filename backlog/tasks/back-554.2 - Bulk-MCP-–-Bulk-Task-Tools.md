---
id: BACK-554.2
title: "[Bulk] MCP – Bulk Task Tools"
status: Deferred
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
labels:
  - feature
  - mcp
dependencies: []
parent_task_id: BACK-554
priority: medium
ordinal: 300000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Neue MCP-Tools für Bulk-Operationen auf Tasks.

**Tools:**
- `task_bulk_complete` – { ids: string[] }
- `task_bulk_archive` – { ids: string[] }
- `task_bulk_update_status` – { ids: string[], status: string }

**Pattern:** schema in schemas.ts → handler in handlers.ts → registration in index.ts. Nutzt die REST-Bulk-Endpoints oder direkt core.updateTasksBulk(). DestructiveHint bei complete/archive.

**Dependency:** Setzt REST Bulk Endpoints voraus (die Business-Logik).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 task_bulk_complete Tool registriert mit Schema { ids: string[] } und ruft Bulk-complete-Logik auf
- [ ] #2 task_bulk_archive Tool registriert mit gleichem Schema und ruft Bulk-archive-Logik auf
- [ ] #3 task_bulk_update_status Tool registriert mit Schema { ids: string[], status: string }
- [ ] #4 Tools haben annotations: { destructiveHint: true } für complete/archive
- [ ] #5 Fehlerbehandlung: pro Task mapped, Gesamtergebnis zurückgegeben
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred: MCP bulk tools (task_bulk_complete, task_bulk_archive, task_bulk_update_status) pose LLM amok risk with destructive operations. Will be added later with forced confirmation flag and non-default tool registration.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->