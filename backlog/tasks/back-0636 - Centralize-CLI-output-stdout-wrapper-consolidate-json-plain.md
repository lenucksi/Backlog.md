---
id: BACK-0636
title: "Centralize CLI output: stdout() wrapper + consolidate --json/--plain"
status: Done
assignee:
  - "@agent"
created_date: 2026-07-12 19:22
updated_date: 2026-07-12 20:30
completed_date: 2026-07-12 20:30
labels:
  - tech-debt
  - refactoring
  - cli
milestone: m-15
dependencies: []
modified_files:
  - src/utils/output.ts
  - src/commands/task.ts
  - src/commands/label.ts
  - src/commands/doc.ts
  - src/commands/decision.ts
  - src/commands/milestone.ts
  - src/commands/config.ts
  - src/commands/search.ts
  - src/commands/statistics.ts
  - src/commands/author.ts
  - src/commands/draft.ts
  - src/commands/overview.ts
  - src/commands/init.ts
  - src/commands/board.ts
  - src/commands/browser.ts
  - src/commands/sequence.ts
  - src/commands/cleanup.ts
  - src/commands/migrate.ts
  - src/commands/open.ts
  - src/commands/instructions.ts
  - src/commands/agents.ts
  - src/commands/completion.ts
priority: medium
ordinal: 437000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The CLI currently has 268 `console.log(...)` calls scattered across `src/commands/*.ts` for command output. Additionally, `--json` is defined 8× and `--plain` 14× independently across commands — each with its own `if (options.json) { console.log(JSON.stringify(...)) }` inline pattern.

**Goal:** Create a single `stdout()` output wrapper in `src/utils/output.ts` that:
1. Is the ONE place CLI output goes through (pipeable stdout, not stderr)
2. Handles `--json` mode: `JSON.stringify(data, null, 2)` zentral für alle Datentypen (Task, Document, Decision, Label[], Config, Statistics, etc.)
3. Handles `--plain` mode: delegiert an formatFn (z.B. `formatTaskPlainText` für Tasks)
4. Default mode: einfacher String-Output
5. Eliminiert alle 268 `console.log` + alle `if (options.json)`/`if (options.plain)` Verzweigungen

**Daten-Shapes für JSON** (alle JSON-serialisierbar, kein Custom-Serializer nötig):
- `Task` / `Task[]` (+ optional `_labelChanges`)
- `Document` / `Document[]`
- `Decision` / `Decision[]`
- `LabelConfig[]` / `AuthorConfig[]`
- `Milestone[]`
- `Statistics`
- `BacklogConfig`

**Plain mode** braucht nur einen formatter für Tasks (`formatTaskPlainText`); alle anderen Typen werden via `String()` ausgegeben.

**Referenzen:**
- `src/commands/*.ts` — 20+ Dateien mit console.log + options.json/plain
- `src/formatters/task-plain-text.ts` — existierender Plain-Formatter
- `src/utils/logger.ts` — existierender Logger (consola, für stderr)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 src/utils/output.ts exports stdout() with auto/plain/json modes
- [x] #2 SetOutputMode() wired from --json/--plain CLI flags
- [x] #3 All 268 console.log calls in src/commands/ replaced with stdout()
- [x] #4 All 8 --json option definitions consolidated into central handling
- [x] #5 All 14 --plain option definitions consolidated into central handling
- [x] #6 bun run check:types passes
- [x] #7 bun test passes
- [x] #8 bun run check . --write passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Centralized CLI output with `stdout()` wrapper in `src/utils/output.ts`. All 268 `console.log` calls in `src/commands/*.ts` replaced with `stdout()`. All `if (options.json)` / `if (options.plain)` inline branching consolidated into central `applyOutputOptions()` + `getOutputMode()` pattern.

## Changes
- **NEW** `src/utils/output.ts`: `stdout()`, `setOutputMode()`, `getOutputMode()`, `applyOutputOptions()` — central CLI output with auto/plain/json modes
- **21 command files modified**: task.ts (~30 console.log → stdout), label.ts, doc.ts, decision.ts, milestone.ts, config.ts, search.ts, statistics.ts, author.ts, draft.ts, overview.ts, init.ts, board.ts, browser.ts, sequence.ts, cleanup.ts, migrate.ts, open.ts, instructions.ts, agents.ts, completion.ts
- **Pattern**: Each action handler now calls `applyOutputOptions(options)` first, then uses `stdout(data)` for output. JSON mode auto-serializes via `JSON.stringify(data, null, 2)`. Plain mode delegates to `formatFn`. Auto mode uses `formatFn` if provided, else `String(data)`.

## Commit
`e2702f93` — refactor(cli): BACK-0636 - centralize CLI output with stdout() wrapper
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 npx aislop scan shows no new code-quality/duplicate-block warnings for changed files
- [ ] #6 No trivial restating comments added in new/changed code
- [ ] #7 react-hooks/exhaustive-deps clean for any changed React components
- [ ] #8 No leftover console.log/debug from development (distinguish from intended CLI output)
<!-- DOD:END -->