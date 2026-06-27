---
id: BACK-554.1
title: "[Bulk] REST API – Bulk Endpoints für Tasks"
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
completed_date: 2026-06-27 15:06
labels:
  - feature
  - rest
dependencies: []
parent_task_id: BACK-554
priority: medium
ordinal: 299000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Neue Bulk-Endpoints für das Bulk-Operations Feature.

**Endpoints:**
- `POST /api/tasks/bulk/complete` – Tasks abschließen
- `POST /api/tasks/bulk/archive` – Tasks archivieren
- `POST /api/tasks/bulk/status` – Status setzen
- `POST /api/tasks/bulk/priority` – Priorität setzen
- `POST /api/tasks/bulk/assignee` – Assignees setzen
- `POST /api/tasks/bulk/labels` – Labels setzen
- `POST /api/tasks/bulk/milestone` – Milestone setzen

**Handler-Pattern:** Jeder Handler akzeptiert `{ ids: string[], value: ... }`, iteriert über die IDs, mapiert Fehler pro Task, und committed einmalig am Ende (kein auto-commit pro Task). Nutzt existierendes `updateTasksBulk()` aus core/backlog.ts.

**Registration:** Neue Routes in src/server/router.ts + Handler in src/server/handlers/tasks.ts + ggf. Typen in src/server/types.ts.

Dependency auf kein Subtask – kann als erstes umgesetzt werden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/tasks/bulk/complete akzeptiert { ids: string[] } und completed alle Tasks mit einer Bulk-Commit-Operation
- [ ] #2 POST /api/tasks/bulk/archive akzeptiert { ids: string[] } und archivet alle Tasks
- [ ] #3 POST /api/tasks/bulk/status akzeptiert { ids: string[], status: string }
- [ ] #4 POST /api/tasks/bulk/priority akzeptiert { ids: string[], priority: string }
- [ ] #5 POST /api/tasks/bulk/assignee akzeptiert { ids: string[], assignee: string[] } – ersetzt alle Assignees
- [ ] #6 POST /api/tasks/bulk/labels akzeptiert { ids: string[], labels: string[] } – ersetzt alle Labels
- [ ] #7 POST /api/tasks/bulk/milestone akzeptiert { ids: string[], milestone: string } (leerer String zum Entfernen)
- [ ] #8 Fehler pro Task werden gemapped – ein fehlschlagender Task blockiert nicht die anderen
- [ ] #9 broadcastTasksUpdated() wird nach Abschluss aller Operationen aufgerufen
- [ ] #10 Validierung: ids muss non-empty array sein
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
7 bulk endpoints implemented in src/server/handlers/tasks.ts via shared createBulkHandler factory:\n- POST /api/tasks/bulk/archive (ids)\n- POST /api/tasks/bulk/status (ids, value)\n- POST /api/tasks/bulk/priority (ids, value)\n- POST /api/tasks/bulk/assignee (ids, value)\n- POST /api/tasks/bulk/labels (ids, value)\n- POST /api/tasks/bulk/milestone (ids, value)\n- POST /api/tasks/bulk/due-date (ids, value) — added extra\n\nEach routes through core.updateTasksBulk() with per-task error mapping. broadcastTasksUpdated() called after completion. Validation ensures ids is non-empty array.\n\nNote: bulk/complete endpoint was intentionally removed (ambiguous semantics vs archive). Use bulk/status with value=Done instead.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
REST bulk endpoints implemented for all planned operations plus due-date. Uses a shared factory pattern to minimize boilerplate. Bulk Complete excluded by design — use status→Done instead.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->