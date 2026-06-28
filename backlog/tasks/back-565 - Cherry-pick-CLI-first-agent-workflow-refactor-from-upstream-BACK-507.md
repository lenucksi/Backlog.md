---
id: BACK-565
title: Cherry-pick CLI-first agent workflow refactor from upstream (BACK-507)
status: To Do
assignee: []
created_date: 2026-06-17 10:39
updated_date: 2026-06-21 13:35
labels:
  - upstream
  - cli
  - agents
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/686
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/pull/686 — BACK-507 - CLI-first agent workflow refactor and local instruction surface

## What this is
Massive refactor (64 files, +4440/-418 lines) that introduces a CLI-first agent workflow. Generated agent instruction files stay tiny and tell agents to load workflow from `backlog instructions overview`. Key components:
- `src/commands/instructions.ts` — `backlog instructions --list` and guide-specific output
- `src/commands/help-schema.ts` — reusable help-schema rendering showing required/optional fields, reads, writes, examples
- `src/guidelines/cli-instructions/` — overview, task-creation, task-execution, task-finalization, init-required guides
- `src/guidelines/cli-agent-nudge.md` — short agent nudge replacing long generated guide
- Self-correcting CLI errors with suggestions, accepted values, exact help commands
- CLI parity: `backlog milestone add/rename/remove`, `backlog doc search`, `backlog task list --labels/--search/--limit`, `backlog task complete`
- Root command ASCII splash, colorized TTY output, `--plain` mode
- Init default migration from MCP to CLI instructions
- Tests: `src/test/cli-agents.test.ts`, `src/test/cli-doc-search.test.ts`, `src/test/cli-milestone-management.test.ts`, `src/test/cli-root-entry.test.ts`, `src/test/cli-splash.test.ts`, `src/test/unified-view-filters.test.ts`, `src/test/task-search-label-filter.test.ts`

## Impact on our fork
This touches many files we've diverged on: `src/cli.ts`, `src/core/backlog.ts`, `src/core/init.ts`, `src/file-system/operations.ts`, `src/ui/board.ts`, `src/ui/root-entry.ts`, `src/mcp/tools/*`, tests, etc. The commit is 308 commits ahead of our common ancestor with upstream.

## Complexity
HIGH — this is the most complex upstream change to integrate. Cherry-picking will require significant manual work and careful conflict resolution across almost every subsystem. Expect major rework.

## Notes
- Cherry-picking is NOT a straight merge/rebase. Expect major manual adaptation across ~30 diverged files.
- High-value change: significantly improves agent experience and CLI usability
- The upstream commit 5a6d8617 is already in upstream's main branch
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->