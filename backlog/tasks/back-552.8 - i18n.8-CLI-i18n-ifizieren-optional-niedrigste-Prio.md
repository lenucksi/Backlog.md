---
id: BACK-552.8
title: i18n.8- CLI i18n-ifizieren (optional, niedrigste Prio)
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - cli
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: low
ordinal: 295000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CLI Output-Strings via shared i18next core übersetzen.

Scope:
- Command descriptions (Commander help texts)
- Task-Plain-Text-Formatter output
- Error messages
- Success/info messages
- Wizard prompts

Betroffene Dateien:
- src/cli.ts (Command descriptions)
- src/commands/*.ts
- src/formatters/task-plain-text.ts
- src/board.ts

Prio: Niedrig. CLI-Outputs sind meist kurz und technisch. Deutschsprachige CLI ist nice-to-have.

Lieferartefakte:
- src/i18n/locales/{en,de}/commands.json (weitere CLI-Keys)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->