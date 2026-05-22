---
id: BACK-524
title: 'CLI: milestone create/rename/remove commands'
status: To Do
assignee: []
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 11:29'
labels:
  - cli
  - milestone
  - parity
  - feature
milestone: m-12
dependencies: []
documentation:
  - doc-005
priority: medium
ordinal: 227000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

CLI hat nur `milestone list` und `milestone archive`. Milestone create/rename/remove gibt es nur in WebUI und MCP, was Agenten und CLI-Nutzer zwingt, den Kontext zu wechseln.

(Basierend auf DOC-005 STUB-P1)

## What

### 1. `backlog milestone create <name> [--description <text>]`
- Erzeugt neue Milestone-Datei in backlog/milestones/
- Validiert: kein Duplikat-Name
- Ggf. Editor öffnen für Description

### 2. `backlog milestone rename <old-name> <new-name>`
- Nutzt die bestehende FileSystem.renameMilestone() oder äquivalent
- Updated referenzierende Tasks (Milestone-Feld)

### 3. `backlog milestone remove <name>`
- Nutzt die bestehende removeMilestone()-Funktion
- --keep (default): Tasks behalten den Milestone-Referenz
- --clear: Milestone von Tasks entfernen
- --reassign <target>: Tasks auf anderen Milestone umsetzen

## Implementation plan
1. Read existing milestone CLI commands (src/commands/ maybe) für Pattern
2. Read MCP milestone tools für vorhandene create/rename/remove Implementierung
3. Read FileSystem / Core milestone methods
4. CLI commands bauen in src/commands/milestone.ts (oder src/cli.ts)
5. Typecheck + lint + test

## Files to modify
- `src/cli.ts` — Neue Subcommands registrieren
- Oder `src/commands/milestone.ts` — Command-Implementierung
- Ggf. Core/FileSystem falls Methoden fehlen

## References
- DOC-005 STUB-P1
- Bestehende MCP milestone tools als Implementierungsreferenz
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
