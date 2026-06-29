---
id: BACK-0613
title: Add 7 undocumented CLI commands to CLI-INSTRUCTIONS.md
status: Done
assignee: []
created_date: 2026-06-29 14:12
updated_date: 2026-06-29 14:19
completed_date: 2026-06-29 14:19
labels:
  - docs
dependencies: []
modified_files:
  - CLI-INSTRUCTIONS.md
  - src/guidelines/agent-guidelines.md
ordinal: 403000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CLI-INSTRUCTIONS.md is missing 7 entire commands and ~20+ flags across documented commands. This is a large documentation update.

**Missing commands to add:**
- `backlog stats` — project statistics
- `backlog milestone` — milestone management (list, add, archive, etc.)
- `backlog label` — label management
- `backlog author` — author management
- `backlog open` — open backlog in browser
- `backlog sequence` — task sequence management
- `backlog migrate` — directory structure migration

**Missing flags on documented commands:**
- Task create: --due-date, --defer-date, --milestone, --ordinal, --modified-file, --json
- Task edit: --due-date, --defer-date, --clear-*, --add-label, --remove-label, --clear-labels, --modified-file, --ordinal, --json
- Task list: --sort, --overdue, --due-soon, --deferred, --milestone, --priority, --json
- Task view subcommand (entirely missing)
- Task labels subcommand (entirely missing)
- Search: --json, --limit, --modified-file, --type (multi)
- Board: --layout, --vertical, --milestones
- Browser: --non-interactive
- Doc: archive, delete subcommands
- Decision: resolve, supersede subcommands
- Config: --json flags

**Also update agent-guidelines.md** with these missing commands/flags.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->