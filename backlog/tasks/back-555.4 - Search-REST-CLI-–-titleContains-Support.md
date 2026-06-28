---
id: BACK-555.4
title: "[Search] REST & CLI – titleContains Support"
status: Done
assignee: []
created_date: 2026-06-09 12:56
updated_date: 2026-06-27 09:39
completed_date: 2026-06-27 09:39
labels:
  - superseded
  - feature
  - rest
  - cli
dependencies: []
parent_task_id: BACK-555
priority: low
ordinal: 307000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optionale Erweiterung der REST-API und CLI um titleContains-Support.

**REST (/api/search):**
- `titleContains` Query-Parameter zu handleSearch() hinzufügen
- Wird an searchService.search() oder direkten task.title.includes() weitergegeben
- Filter ist additiv zu bestehenden query/status/priority/labels-Parametern

**CLI:**
- `backlog task list --title-contains "text"` Flag hinzufügen
- Filtert die Ergebnisse nach task.title.includes()
- Kombinierbar mit --status, --assignee, --milestone, --priority

**Dependency:** Beides optional – die WebUI und TUI sind die primären Interfaces. Kann separat priorisiert werden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 (REST) /api/search akzeptiert ?titleContains= Query-Parameter
- [ ] #2 (REST) titleContains ist case-insensitive substring match auf task.title
- [ ] #3 (CLI) backlog task list --title-contains <text> Flag vorhanden
- [ ] #4 (CLI) Kombinierbar mit --status/--assignee/--milestone/--priority Flags
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nicht implementiert – Parent BACK-555 erwies sich als überflüssig.

REST /api/search verwendet Fuse.js via SearchService – substring auf Titel ist bereits abgedeckt. CLI `backlog task list` nutzt `core.queryTasks()` mit selbem Fuse.js-Index. Ein `--title-contains` Flag oder `?titleContains=` Parameter wäre zusätzliche API-Fläche ohne reales Bedürfnis.

Referenz: Discovery-Log in BACK-555.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Nicht nötig – REST + CLI decken substring-Suche bereits via Fuse.js ab. titleContains-Parameter/Flag wäre API-Bloat.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->