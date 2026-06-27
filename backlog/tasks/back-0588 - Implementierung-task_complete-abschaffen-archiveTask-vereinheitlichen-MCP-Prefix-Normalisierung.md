---
id: BACK-0588
title: "Implementierung: task_complete abschaffen, archiveTask vereinheitlichen,
  MCP-Prefix-Normalisierung"
status: Done
assignee: []
created_date: 2026-06-27 17:56
updated_date: 2026-06-27 18:24
completed_date: 2026-06-27 18:24
labels:
  - refactor
dependencies: []
priority: high
ordinal: 345000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
# Aufgabe

Setzt den Architekturentscheid `decision-0002` um.

## Scope

8 Phasen über ~30 Dateien:

1. **Core/FS**: `completeTask()` raus, `archiveTask()` kriegt `status: "Archived"`-Stamp nach Move
2. **MCP**: `task_complete`-Tool entfernen, Prefix-Normalisierung (`backlog_` prefix bei author/label/statistics/open entfernen)
3. **CLI**: `backlog task complete`-Command entfernen, Guard für `task archive` (block terminal status)
4. **REST**: `/api/tasks/:id/complete`-Endpoint entfernen, Guard für `DELETE /api/tasks/:id`
5. **TUI**: `completeTask`-Aufrufe → `archiveTask`
6. **WebUI**: `completeTask()`-Methode aus API-client entfernen
7. **Docs**: `overview.md`, `overview-tools.md`, `task-finalization.md` — `task_complete`-Referenzen raus
8. **Tests**: Alle Tests auf neue Architektur anpassen (`mcp-task-complete.test.ts` löschen, andere migrieren)

## Wichtige Details

- `archiveTask` filesystem-level kriegt den Stamp nach Move (bisher nur bei `completeTask`)
- MCP `task_archive` handler: Error-Message aktualisieren (kein `task_complete`-Verweis mehr)
- TUI/WebUI dürfen ohne Guard archivieren (Mensch bestätigt), CLI/MCP/REST blockieren Archivierung von Terminal-Status-Tasks
- Prefix-Änderung: `backlog_author_list`, `backlog_author_add`, etc → `author_list`, `author_add`, etc
- Cleanup (CLI + REST) nutzt jetzt `archiveTask` statt `completeTask`
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
Vollständige Umsetzung von decision-0002:

**Abgeschafft:** `task_complete` komplett aus allen Schichten entfernt (MCP-Tool, Core/FS-Methoden, CLI-Command, REST-Endpoint, WebUI-API, TUI-Shortcut).

**Vereinheitlicht:** `archiveTask` ist jetzt die einzige "weg damit"-Operation. Macht file-move + setzt `status: "Archived"` in Frontmatter. Die alte `completeTask`-Logik (Stamp) wurde in `archiveTask` gemerged.

**Guards konsistent:** CLI `task archive` + MCP `task_archive` + REST `DELETE` blockieren jetzt Archivierung von Terminal-Status-Tasks. TUI + WebUI dürfen mit menschlicher Bestätigung archivieren.

**Prefix-Normalisierung:** `backlog_author_*` → `author_*`, `backlog_label_*` → `label_*`, `backlog_get_statistics` → `get_statistics`, `backlog_open_in_browser` → `open_in_browser`.

**Docs:** `overview.md`, `overview-tools.md`, `task-finalization.md` von `task_complete`-Referenzen befreit.

**Tests:** 132 Tests pass, typecheck clean, Biome check clean. ~30 Dateien geändert.
<!-- SECTION:FINAL_SUMMARY:END -->