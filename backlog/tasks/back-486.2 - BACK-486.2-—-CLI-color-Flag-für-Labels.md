---
id: BACK-486.2
title: BACK-486.2 — CLI --color Flag für Labels
status: In Progress
assignee: []
created_date: 2026-06-08 18:00
updated_date: 2026-06-08 18:23
labels:
  - labels
  - cli
  - color
dependencies: []
parent_task_id: BACK-486
priority: medium
ordinal: 273000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Beschreibung

CLI-Flags für Farb-Management von Labels.

### Änderungen

1. **src/commands/label.ts**:
   - `label add <name> --color "#ff0000"` — Label mit Farbe anlegen
   - `label set-color <name> <color>` — Farbe eines bestehenden Labels ändern
   - `label remove-color <name>` — Farbe entfernen (wieder zu plain string)
   - `label list` — Farbe in ANSI anzeigen (hexToAnsi256)
   - `label list --json` — Farbfeld im JSON

2. **src/server/handlers/config.ts** — PUT `/api/config/labels/:name` body um `color`-Feld erweitern

3. **src/mcp/tools/labels/** — MCP-Tools um color-Parameter erweitern

### Ausgeschlossen
- MCP-Tools für color (wird in BACK-486.3/4 mit Author-CRUD konsolidiert)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->