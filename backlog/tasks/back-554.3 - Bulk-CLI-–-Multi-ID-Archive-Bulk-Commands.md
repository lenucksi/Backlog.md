---
id: BACK-554.3
title: "[Bulk] CLI – Multi-ID Archive & Bulk Commands"
status: Deferred
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 15:06
labels:
  - feature
  - cli
dependencies: []
parent_task_id: BACK-554
priority: low
ordinal: 301000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Erweitert CLI commands für Bulk-Operations. 

**`backlog task archive`:**
- Aktuell: `archive <id>` (single) – erweitern auf `archive <id1> [id2...]` (multi-ID)
- Pattern folgt existierendem `complete <id1> [id2...]` in commands/task.ts

**Neue Bulk-Commands (optional, je nach Priorisierung):**
- `backlog task bulk-status <status> <id1> [id2...]`
- `backlog task bulk-priority <priority> <id1> [id2...]`
- `backlog task bulk-milestone <milestone> <id1> [id2...]`
- `backlog task bulk-assignee <assignee> <id1> [id2...]`
- `backlog task bulk-labels <labels> <id1> [id2...]`

**Dependency:** Setzt REST Bulk Endpoints voraus (die Business-Logik). Kann auch direkt core.updateTasksBulk() nutzen.

Hinweis: `backlog task complete <id1> [id2...]` unterstützt bereits mehrere IDs – muss nicht geändert werden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 backlog task archive <id1> [id2...] akzeptiert mehrere IDs und archiviert sie bulk
- [ ] #2 Fehlermeldung wenn keine IDs angegeben
- [ ] #3 Erfolgsmeldung mit Count der archivierten Tasks
- [ ] #4 (Optional) Neue bulk-* Subcommands wie bulk-status, bulk-priority, bulk-milestone
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred: CLI bulk commands (bulk-status, bulk-priority, bulk-assignee, bulk-labels, bulk-milestone, multi-ID archive) pose LLM amok risk with destructive bulk operations. backlog task complete already supports multi-ID. Will add remaining commands later with forced confirmation flag.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->