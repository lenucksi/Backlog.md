---
id: BACK-0597
title: Dead Code entfernen + Dependencies säubern
status: Done
assignee: []
created_date: 2026-06-28 18:18
updated_date: 2026-06-29 10:23
completed_date: 2026-06-29 10:23
labels:
  - cleanup
  - refactoring
  - tech-debt
milestone: m-15
dependencies: []
modified_files:
  - src/core/backlog.ts
  - package.json
  - knip.json
priority: high
ordinal: 373000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vier unabhängige Aufräum-Aktionen: 1) Zwei orphaned UI-Dateien löschen (enhanced-views.ts, simple-unified-view.ts, ~332 Zeilen), 2) Fünf Type-Stubs aus src/types/ löschen (gifenc, upng-js, raw, markdown, mermaid-dist), 3) Core.fs deprecated public field aus backlog.ts entfernen, 4) @xenova/transformers und install aus package.json entfernen, @clack/core und @clack/prompts in dependencies verschieben.

subagent-reports/tech-debt-scout.md — Sections 1a (deps), 3a-c (dead code), 3d (deprecated field)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 src/ui/enhanced-views.ts gelöscht
- [x] #2 src/ui/simple-unified-view.ts gelöscht
- [x] #3 5 Type-Stubs in src/types/ gelöscht
- [x] #4 Core.fs deprecated field aus backlog.ts entfernt
- [x] #5 @xenova/transformers aus package.json entfernt
- [x] #6 install aus package.json entfernt
- [x] #7 @clack/core + @clack/prompts in dependencies
- [x] #8 bun run check . passes
- [ ] #9 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Orphaned UI: `rm src/ui/enhanced-views.ts src/ui/simple-unified-view.ts` — vorher imports prüfen
2. Type-Stubs: `rm src/types/gifenc.d.ts src/types/upng-js.d.ts src/types/raw.d.ts src/types/markdown.d.ts src/types/mermaid-dist.d.ts`
3. Deprecated field: src/core/backlog.ts ~Zeile 677 — `public fs: FileSystem` löschen, `rg "\.fs\b"` prüfen
4. Dependencies: `bun remove @xenova/transformers install`, dann @clack/core + @clack/prompts von devDependencies nach dependencies verschieben in package.json
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Knip hat die orphaned files NICHT gefunden weil sie in knip.json unter `ignore` stehen. Nach dem Löschen knip.json aufräumen.

@clack Verschiebung: Werden runtime in 7 Command-Dateien importiert. Ist packaging-fix für `bun install --production`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Dead Code entfernt: 2 orphaned UI-Dateien (enhanced-views.ts, simple-unified-view.ts), 5 Type-Stubs (gifenc, upng-js, raw, markdown, mermaid-dist). Core.fs deprecated field in backlog.ts durch private _filesystem ersetzt (94 Referenzen umgestellt, public getter bleibt als API). Dependencies: @xenova/transformers und install entfernt, @clack/core und @clack/prompts von devDependencies nach dependencies verschoben. knip.json aufgeräumt (ignore-Einträge für gelöschte Dateien entfernt).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->