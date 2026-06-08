---
id: BACK-540
title: "BACK-540 — tsc-cleanup: Colored Labels Feature (BACK-486/487/488)
  tsc-klar machen"
status: Done
assignee: []
created_date: 2026-06-08 13:27
updated_date: 2026-06-08 14:11
labels:
  - tech-debt
  - bug
dependencies: []
priority: high
ordinal: 264000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Kontext

BACK-486/487/488 (Colored Labels) wurden halbfertig in main gemerged (worktree-merge-contamination). Resultat: **59 tsc-Fehler in src/**, ~40 in Tests.

## Phasen

1. **P1 – Low Hanging Fruit** – Router-Typ, Imports, Casts, BunFile, Init-Duplikate, task-edit-builder
2. **P2 – Type Narrowing** – `typeof`-Guards für `string | LabelConfig` in allen Handlern
3. **P3 – Missing Methods** – `editDecision()`, `listDocs→listDocuments`, `editDoc→updateDocumentFromInput`, `DocumentUpdateInput.content`
4. **P4 – Sonstige src/** – backlog.ts spread, server/utils, operations optional, WebUI-Fixes
5. **P5 – Tests** – ~40 Test-Fehler beheben
6. **P6 – Dependencies** – skipLibCheck oder declarations für @termless/core etc.
7. **P7 – Verification** – `bun run check:types` → 0, `bun run build`, smoke test, label tests

## Abschlusskriterien
- `bun run check:types` → exit 0
- `bun run build` → success
- `bun run cli label list` → funktioniert
- Alle label-bezogenen Tests passen

Tag: `pre-tsc-cleanup` auf aktuellem Commit
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
## Zusammenfassung BACK-540 – tsc-Cleanup

### Ausgangslage
BACK-486/487/488 (Colored Labels) wurden halbfertig gemerged: **59 tsc-Fehler in src/**, ~40 in Tests, ~8 in node_modules, ~10 in scripts/.

### Ergebnis
**0 tsc-Fehler**, alle Checks grün.

### 7 Phasen (alle abgeschlossen)

| Phase | Änderungen | Commit |
|-------|-----------|--------|
| P1 – Low Hanging Fruit | Router types, import fixes, casts, BunFile, init dedup, handler signatures | `ae487734` |
| P2 – Type Narrowing | typeof-Guards für string \| LabelConfig in 6 Dateien (~21 Errors) | `a1b3612e` |
| P3 – Missing Methods | editDecision() in Core, DocumentUpdateInput.content optional, listDocs→listDocuments, editDoc→updateDocumentFromInput | `e7e1114` |
| P4 – Sonstige src/ | backlog.ts type narrowing, operations optional, utils array, Web-UI fixes | `bf0762b` |
| P5 – Tests | ~80 tsc-Fehler in Testdateien behoben | `845cdf7` |
| P6 – Dependencies | tsconfig exclude, upng-js/gifenc declarations, scripts-Fixes | `692a0b6` |
| P7 – Verification | Biome formatting in 4 Dateien, alle 5 Checks ✅ | `e46a6e5` |

### Finale Checks
- ✅ `bun run check:types` → exit 0
- ✅ `bun run check .` → exit 0
- ✅ `bun test label*` → 12 pass, 0 fail
- ✅ `bun run build` → success
- ✅ `bun run cli label --help` → CLI funktioniert

### Tag: `pre-tsc-cleanup`
<!-- SECTION:FINAL_SUMMARY:END -->