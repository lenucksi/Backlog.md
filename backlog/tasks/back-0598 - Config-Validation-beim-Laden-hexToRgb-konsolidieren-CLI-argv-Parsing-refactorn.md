---
id: BACK-0598
title: Config-Validation beim Laden + hexToRgb konsolidieren + CLI argv-Parsing
  refactorn
status: Done
assignee: []
created_date: 2026-06-28 18:18
updated_date: 2026-06-29 10:28
completed_date: 2026-06-29 10:28
labels:
  - refactoring
  - hygiene
  - tech-debt
milestone: m-15
dependencies: []
modified_files:
  - src/utils/ansi.ts
  - src/file-system/operations.ts
  - src/cli.ts
priority: medium
ordinal: 374000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Drei kleinere Quality-of-Life Fixes: 1) parseConfig() validiert aktuell nicht gegen schema — korruptes File gibt stumm null zurück. Die existierende Validierung aus config-schema.ts muss auch beim Laden laufen. 2) hexToRgb ist in ansi.ts UND color.ts dupliziert — eine Version muss weg. 3) CLI hat hand-rolled argv-Parsing (getPathOverrideFromArgv) das Commander-Features dupliziert.

subagent-reports/tech-debt-scout.md — Section 2a/2b (hexToRgb), 1c (argv parsing)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 parseConfig() validiert gegen config-schema und logged bei Fehlschlag
- [x] #2 hexToRgb existiert nur noch in src/utils/color.ts
- [x] #3 argv-Parsing nutzt Commander-Optionen (oder ist dokumentiert warum nicht)
- [x] #4 bun run check . passes
- [ ] #5 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Config: src/file-system/operations.ts `parseConfig()` — nach YAML.parse() die config-schema Validierung aus src/utils/config-schema.ts aufrufen. Bei Fehler `console.warn('Config validation:', errors)` statt stumm null.
2. hexToRgb: src/utils/color.ts behalten, aus src/utils/ansi.ts entfernen. Alle imports von ansi.ts → color.ts umbiegen.
3. argv: src/cli.ts Zeilen 48-92 — getPathOverrideFromArgv/getMcpStartCwdOverrideFromArgv in program.option('--path', '...') umwandeln. Splash-Screen early-read erhalten.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
hexToRgb: ansi.ts hat zusätzliche Exporte (hexToAnsi256, detectTerminalColorSupport) die erhalten bleiben — nur hexToRgb selbst entfernen und import ersetzen.

argv: Der Splash-Screen liest --path/--cwd BEVOR Commander parst. Das muss erhalten bleiben. Lösung: Commander-Optionen definieren + early-read Funktion behalten oder in Commander-Hook umwandeln.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Config-Validation: parseConfig() warnt jetzt bei unbekannten Config-Keys (KNOWN_CONFIG_KEYS aus config-schema.ts). hexToRgb: aus ansi.ts entfernt, importiert stattdessen aus color.ts (die einzige Source of Truth). CLI argv: --cwd als Commander-Option ergänzt, early-read Funktionen mit Kommentar versehen warum die Duplizierung nötig ist (Splash-Screen + Config-Migration laufen vor Commander).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->