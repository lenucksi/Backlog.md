---
id: BACK-486.3
title: BACK-486.3 — Author CRUD (Config + Settings + CLI + MCP + REST)
status: Done
assignee: []
created_date: 2026-06-08 18:00
updated_date: 2026-06-08 18:52
labels:
  - authors
  - crud
  - labels
  - all-modalities
dependencies: []
modified_files:
  - src/types/index.ts
  - src/file-system/operations.ts
  - src/commands/author.ts
  - src/cli.ts
  - src/server/router.ts
  - src/server/handlers/config.ts
  - src/mcp/tools/authors/index.ts
  - src/mcp/tools/authors/handlers.ts
  - src/mcp/tools/authors/schemas.ts
  - src/mcp/server.ts
  - src/web/lib/api.ts
  - src/web/components/Settings.tsx
  - src/web/App.tsx
parent_task_id: BACK-486
priority: high
ordinal: 274000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Beschreibung

Neues Config-Feld `authors: Array<{name: string; color?: string}>` — kuratierte Autorenliste mit optionaler Farbe. Analog zu `labels`.

Datenquellen (gemerged, gewichtet):
1. `config.authors` (kuratiert, hat Farben) — **bevorzugt**
2. `config.defaultAssignee` / `config.defaultReporter` (Einzelfelder)
3. Gescrapte Assignees aus Task-Frontmatter

### Änderungen

1. **src/types/index.ts** — `AuthorConfig` Interface + `authors` in `BacklogConfig`
2. **src/file-system/operations.ts** — `parseAuthorArray`, serialize in `serializeConfig`
3. **src/commands/author.ts** — `backlog author list/add/rename/remove/set-color/remove-color`
4. **src/cli.ts** — `registerAuthorCommand`
5. **src/server/handlers/config.ts** — Author-REST-Endpoints (analog labels)
6. **src/server/router.ts** — Author-Routen
7. **src/mcp/tools/authors/** — MCP author tools
8. **src/mcp/server.ts** — MCP author tools registrieren
9. **src/web/components/Settings.tsx** — Authors-Sektion (analog Labels)
10. **src/web/lib/api.ts** — Author-API-Funktionen
11. **src/web/App.tsx** — availableAuthors State + Fetch

### Autocomplete-Quelle
- Config-Authors zuerst + gescrapte Assignees aus availableTasks als Fallback
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
BACK-486.3 abgeschlossen: Author CRUD in ALLEN 5 Modalitäten. AuthorConfig-Typ, YAML parse/serialize, CLI backlog author *, MCP author tools, REST /api/config/authors, WebUI Settings-Authors-Sektion mit Color Picker, WebUI API-Funktionen.
<!-- SECTION:FINAL_SUMMARY:END -->