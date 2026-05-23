---
id: BACK-525
title: 'BACK-520 — Ordinal/Reorder + Draft-create: APIs konsolidieren & dokumentieren'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 16:48'
labels:
  - cleanup
  - parity
  - cli
  - mcp
  - documentation
milestone: m-12
dependencies:
  - BACK-403
references:
  - DOC-005 (Feature Parity Matrix)
  - src/core/reorder.ts
  - src/mcp/tools/tasks/handlers.ts
modified_files:
  - src/commands/task.ts
  - src/mcp/tools/tasks/handlers.ts
  - src/mcp/tools/tasks/index.ts
  - src/mcp/tools/tasks/schemas.ts
  - src/guidelines/agent-guidelines.md
priority: medium
ordinal: 229000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Die ordinal/reorder + draft-create API-Oberfläche ist über mehrere Modi hinweg inkonsistent:

### Ordinal/Reorder
- **CLI**: `--ordinal` in `task create` + `task edit` + `--sort ordinal` in `task list` — aber KEIN `task reorder` command
- **MCP**: `ordinal` in `task_create` + `task_edit` input schemas — aber KEIN `task_reorder` tool
- **WebUI**: native reorder via drag-and-drop auf dem Board (`POST /api/tasks/reorder`)
- **TUI**: native reorder via keyboard in board.ts
- **Core**: vollständige reorder engine in `src/core/reorder.ts` mit `calculateNewOrdinal()`, `resolveOrdinalConflicts()`, `reorderTask()`
- Agent guidance in `src/guidelines/agent-guidelines.md` ist verstreut und unvollständig

### Draft-create via MCP
- MCP hat kein `draft_create` tool — man muss `task_create(status="Draft")` verwenden
- Das ist intransparent und nicht discoverable
- WebUI hat kein `Create Draft` — nur `task create` mit Status-Auswahl

## What

### 1. CLI `task reorder` command
- `backlog task reorder <id> [--after <id>] [--before <id>] [--ordinal <n>]`
- Nutzt die bestehende `core.reorderTask()` engine

### 2. MCP `task_reorder` tool
- Zod schema: `{ id: string, after?: string, before?: string, ordinal?: number, status?: string, milestone?: string }`
- Nutzt bestehende reorder engine
- Folgt dem vorhandenen MCP-Tool-Pattern

### 3. Draft-create Klärung
- Entscheidung: dediziertes `draft_create` MCP tool? Oder reicht `task_create(status="Draft")` mit besserer Doku?
- Empfehlung für den Weg festlegen und dokumentieren

### 4. Dokumentation zentralisieren
- `src/guidelines/agent-guidelines.md` ergänzen mit:
  - Wie Reorder funktioniert (Konzept: `ordinal` als Gleitkomma-ordnung)
  - Verfügbare Wege pro Modality (CLI `--ordinal`, MCP `ordinal` field, WebUI DnD, TUI keyboard)
  - Draft-Erstellung via CLI (`backlog task create --status Draft`), MCP (`task_create status`), WebUI

## Files to modify
- `src/commands/task.ts` — CLI reorder command (neues Subcommand)
- `src/mcp/tools/tasks/` — MCP task_reorder tool (neues Tool)
- `src/guidelines/agent-guidelines.md` — Dokumentation
- Ggf. `src/types/index.ts` — Typen falls nötig

## Out of scope
- Core reorder engine umbauen (existiert, funktioniert)
- WebUI/TUI reorder ändern (existiert, funktioniert)
- Neues ordinal-Konzept einführen

## Implementation plan
1. Recherche: bestehende reorder engine verstehen + ordinal-Typen checken
2. CLI `task reorder` command bauen
3. MCP `task_reorder` tool bauen (schemas + handler + registration)
4. Draft-create Entscheidung treffen und Doku schreiben
5. agent-guidelines.md aktualisieren
6. Typecheck + lint + test

## Dependencies
- BACK-403 (Done: Expose ordinal in MCP task tools) — existing ordinal support

## References
- DOC-005 (Feature Parity Matrix) — zeigt ⚠️ für Reorder in CLI/MCP
- src/core/reorder.ts — Core reorder engine
- src/mcp/tools/tasks/handlers.ts — Bestehende MCP task tools als Pattern
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added CLI `task reorder` with --after/--before/--ordinal flags and MCP `task_reorder` tool. Both use existing core.reorderTask() engine. Added reorder documentation to agent-guidelines.md.
<!-- SECTION:FINAL_SUMMARY:END -->
