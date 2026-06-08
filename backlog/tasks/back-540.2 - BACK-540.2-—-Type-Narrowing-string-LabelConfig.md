---
id: BACK-540.2
title: BACK-540.2 — Type Narrowing string | LabelConfig
status: Done
assignee: []
created_date: 2026-06-08 13:27
updated_date: 2026-06-08 13:39
labels:
  - tech-debt
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 266000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 2 des tsc-Cleanups. ~21 tsc-Fehler durch fehlende `typeof`-Guards für `string | LabelConfig`.

Alle `.toLowerCase()`/.localeCompare() auf `Array<string | LabelConfig>` mit `typeof` guard versehen.

Pattern:
```typescript
// VORHER:
labels.some(l => l.toLowerCase() === name)
// NACHHER:
typeof l === "string" ? l.toLowerCase() === name : l.name.toLowerCase() === name
```

## Betroffene Dateien
- src/server/handlers/config.ts (6 Stellen)
- src/mcp/tools/labels/handlers.ts (6 Stellen)  
- src/commands/label.ts:34 (Set<string> totes ternary)
- src/ui/task-viewer-with-search.ts:215,224 (labels-Typ)
- src/web/App.tsx:282 (useState string[] → (string | LabelConfig)[])
- src/web/components/Settings.tsx:278+ (label rendern)

Abhängigkeiten: BACK-540.1
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Phase 2 abgeschlossen: src-Fehler von 35 auf 14 reduziert (~21 Errors gefixt).
Alle typeof(l === "string" ? l : l.name)-Guards für toLowerCase/localeCompare auf config.labels (Array<string | LabelConfig>) in:
- src/server/handlers/config.ts (6 Stellen)
- src/mcp/tools/labels/handlers.ts (6 Stellen)
- src/commands/label.ts:34 (Set<string> totes ternary simplified)
- src/ui/task-viewer-with-search.ts (labels-Variable type geändert + LabelConfig import)
- src/web/App.tsx (setAvailableLabels extrahiert Namen)
- src/web/components/Settings.tsx (label rendering + rename/remove args mit typeof guard)
<!-- SECTION:NOTES:END -->