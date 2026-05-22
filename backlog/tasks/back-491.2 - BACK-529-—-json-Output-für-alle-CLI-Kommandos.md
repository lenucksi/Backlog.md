---
id: BACK-491.2
title: BACK-529 — --json Output für alle CLI-Kommandos
status: Done
assignee: []
created_date: '2026-05-22 15:57'
updated_date: '2026-05-22 16:06'
labels:
  - cli
  - json
  - feature
  - parity
  - back-491
dependencies: []
parent_task_id: BACK-491
priority: high
ordinal: 240000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aktuell hat nur `backlog stats --json` strukturierten JSON-Output. Alle anderen CLI-Kommandos geben nur Text aus (--plain). Für Agenten und Scripting brauchen wir konsistenten JSON-Output über alle Commands.

## Betroffene Commands

| Command | Heute | Mit --json |
|---|---|---|
| task list | --plain | JSON-Array Task[] |
| task search | --plain | JSON-Array Task[] |
| task view | --plain | JSON-Objekt Task |
| task create | --plain | JSON-Objekt Task |
| task edit | --plain | JSON-Objekt Task |
| config list | --plain | JSON-Objekt Config |
| config get | --plain | JSON-Wert |
| milestone list | --plain | JSON-Array Milestone[] |
| doc list | --plain | JSON-Array Document[] |
| doc view | --plain | JSON-Objekt Document |
| decision list | --plain | JSON-Array Decision[] |
| decision view | --plain | JSON-Objekt Decision |
| stats | ✅ vorhanden | — |

## Architektur

Ein zentraler Helper in `src/utils/output-formatter.ts`:

```typescript
export function formatOutput(data: unknown, options: { json?: boolean; pretty?: boolean }): string {
  if (options.json) return JSON.stringify(data, null, options.pretty ? 2 : undefined);
  return formatAsText(data); // fallback zu bestehender Text-Formatierung
}
```

Jeder Command-Handler:
1. Sammelt Daten als strukturiertes Objekt
2. Ruft `formatOutput(data, { json: flags.json })` auf
3. Gibt das Ergebnis aus

## Referenzen
- doc-005: Feature Parity Matrix (Gap: CLI hat keinen strukturierten Output)
- BACK-491: Cross-Modality CI (Parent)
- BACK-516.2: stats --json (Referenz-Implementierung)
- src/utils/ (Helper hier anlegen)

## Labels
cli, json, feature, parity, back-491
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
