---
id: BACK-0605
title: CLI Harden — SIGINT + Exit-Codes + Help-Descriptions
status: To Do
assignee: []
created_date: 2026-06-28 18:19
updated_date: 2026-06-28 18:20
labels:
  - cli
  - refactoring
  - tech-debt
milestone: m-15
dependencies: []
priority: medium
ordinal: 388000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Das CLI hat drei systematische Defizite: 1) Kein globaler SIGINT-Handler in src/cli.ts — Ctrl+C bricht Commands ohne Cleanup ab (nur browser.ts und mcp.ts haben lokale Handler), 2) 90+ magic numbers für exit codes (process.exit(1), process.exit(0)) statt benannter Konstanten, 3) Fehlende --help descriptions auf Optionen in task.ts, draft.ts, decision.ts, doc.ts.

CLI-Audit: subagent-reports/sonarlint-large-file-analysis.md CLI Section
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 globaler process.on(SIGINT) in src/cli.ts
- [ ] #2 EXIT_CODES Konstanten definiert und überall verwendet
- [ ] #3 --help descriptions auf allen Optionen ergänzt
- [ ] #4 bun run check . passes
- [ ] #5 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. SIGINT: In src/cli.ts nach den imports: `process.on('SIGINT', () => { /* cleanup */ process.exit(0); })`. Die browser.ts und mcp.ts Handler bleiben bestehen (sie machen spezifisches cleanup).
2. Exit Codes: src/utils/exit-codes.ts erstellen mit `const EXIT_CODES = { SUCCESS: 0, ERROR: 1, ... } as const`. Dann alle process.exit(0) → process.exit(EXIT_CODES.SUCCESS) usw. (90+ Stellen).
3. Help Descriptions: task.ts Zeile 1163-1164, draft.ts 73-75, decision.ts 82, doc.ts 20 — `.option('--flag <arg>', 'Description')` ergänzen.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Die Exit-Code-Ersetzung ist 90+ Stellen aber rein mechanisch. Regex Replace ist hier sicherer als manuelles Editieren: `process\.exit\((0|1)\)` → `process.exit(EXIT_CODES.$1 === '0' ? 'SUCCESS' : 'ERROR')`.

Der SIGINT-Handler muss VOR program.parseAsync() registriert werden, sonst fängt Commander das Signal ab.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->