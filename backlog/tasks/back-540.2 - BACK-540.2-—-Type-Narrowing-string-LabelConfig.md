---
id: BACK-540.2
title: BACK-540.2 — Type Narrowing string | LabelConfig
status: In Progress
assignee: []
created_date: 2026-06-08 13:27
updated_date: 2026-06-08 13:36
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