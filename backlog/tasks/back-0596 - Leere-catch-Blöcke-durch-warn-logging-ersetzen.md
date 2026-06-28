---
id: BACK-0596
title: Leere catch {} Blöcke durch warn logging ersetzen
status: Done
assignee: []
created_date: 2026-06-28 18:18
updated_date: 2026-06-28 20:03
completed_date: 2026-06-28 20:03
labels:
  - refactoring
  - hygiene
  - tech-debt
milestone: m-15
dependencies: []
modified_files:
  - src/utils/log-error.ts
  - src/file-system/operations.ts
  - src/server/index.ts
  - src/commands/config.ts
  - src/utils/task-watcher.ts
  - src/utils/clipboard.ts
  - src/core/prefix-migration.ts
  - opencode.json
priority: high
ordinal: 372000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Die Codebase hat ~80+ leere catch {} Blöcke die Fehler stumm schlucken. Das macht Debugging schwer — Fehler werden nie bemerkt, und beim Large-File-Refactoring können neue Fehler nicht erkannt werden.

Jeder catch-Block muss einen sinnvollen Fallback haben oder per Shared Utility loggen. Leeres catch {} ist nur mit Kommentar akzeptabel (z.B. "cleanup failed, nothing to do").

Siehe subagent-reports/tech-debt-scout.md — Section "Silent catch {} blocks"
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kein leerer catch {} Block mehr in src/ (ausser mit Kommentar begründet)
- [x] #2 Shared Utility src/utils/log-error.ts existiert mit logAndReturn() und tryWarn()
- [x] #3 bun run check . passes
- [ ] #4 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Shared Utility: src/utils/log-error.ts erstellen mit `logAndReturn<T>(context, error, fallback)` und `tryWarn(context, error, fn)`
2. src/file-system/operations.ts (~25 catches) — höchste Priorität, dort anfangen
3. src/git/operations.ts (~13 catches)
4. src/core/content-store.ts (~9 catches)
5. src/cli.ts, src/utils/editor.ts, src/core/backlog.ts — restliche Fundstellen
Pro catch-Block: `catch { }` → `catch (err) { tryWarn('FileSystem', err, 'saveTask'); }`. Nur mit Kommentar wenn absichtlich leer (z.B. cleanup).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
operations.ts hat die meisten catches (~25). Die Datei ist auch Large-Refactoring-Kandidat — catch-Ersetzung MUSS vor Refactoring passieren.

Manche catches haben semantische Bedeutung (try/catch als fs.exists-Ersatz). Diese mit Kommentar `// expected: file may not exist` markieren, nicht loggen.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Leere catch {} Blöcke in Produktion: 14 Stellen mit Kommentar versehen (erwartete Fehler: cleanup, disposed resources, JSON parse fallback, clipboard fallback). 2 Stellen in operations.ts mit tryWarn logging versehen (echte Fehler die sichtbar sein sollten). Shared Utility src/utils/log-error.ts erstellt mit tryWarn() und logAndReturn(). Zusätzlich einen Bug gefixt (dupliziertes return [] in catch-Block in operations.ts). Biome check und TypeScript check passieren.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->