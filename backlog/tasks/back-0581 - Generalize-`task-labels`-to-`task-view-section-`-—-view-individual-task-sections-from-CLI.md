---
id: BACK-0581
title: Generalize `task labels` to `task view <section>` — view individual task
  sections from CLI
status: Done
assignee: []
created_date: 2026-06-26 19:23
updated_date: 2026-06-26 19:34
labels:
  - cli
  - enhancement
dependencies: []
priority: low
ordinal: 333000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Motivation
`bun run cli task labels BACK-574` zeigt nur die Labels eines Tasks — nützlich, aber ad-hoc. Das Pattern lässt sich verallgemeinern: `task view labels`, `task view description`, `task view ac`, `task view dod`, `task view plan`, `task view refs`, `task view notes`, usw.

## Gewünschte API
```
backlog task view <taskId>         # → show ALL (wie heute, interaktiv oder plain)
backlog task view <taskId> labels  # → nur Labels (heute als separater Befehl)
backlog task view <taskId> desc    # → description
backlog task view <taskId> plan    # → implementation plan
backlog task view <taskId> notes   # → notes
backlog task view <taskId> ac      # → acceptance criteria (checked/unchecked)
backlog task view <taskId> dod     # → definition of done
backlog task view <taskId> refs    # → references (URLs)
backlog task view <taskId> deps    # → dependencies
backlog task view <taskId> files   # → modified files
backlog task view <taskId> status  # → status + priority
backlog task view <taskId> assignee # → assignees
backlog task view <taskId> milestone # → milestone
```

Oder alternativ als Flag: `backlog task view --section labels BACK-574`

## Anforderungen
- Jeder Sektion-Typ hat eine sinnvolle Plain-Text-Darstellung (kein TUI)
- `--json` Flag gibt das Rohdaten-Fragment aus
- Bei leerer Sektion: "No X." (analog zu labels)
- Farben nutzen (z.B. AC: checked = grün, unchecked = gelb; Status: farbig)
- Format sollte kopierfreundlich sein (keine überflüssigen Decorationen im JSON-Mode)

## Betroffene Dateien
- `src/commands/task.ts` — neuer Subcommand oder Umbau von `view`
- `src/formatters/task-plain-text.ts` — ggf. wiederverwenden

## Priorität
Low-Medium — reiner Convenience-Feature, kein Bugfix.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 task view <taskId> labels displays colored label list (alias: task labels)
- [x] #2 task view <taskId> status shows status + priority
- [x] #3 task view <taskId> assignee shows assignees (prefixed with @)
- [x] #4 task view <taskId> milestone shows milestone
- [x] #5 task view <taskId> desc shows description
- [x] #6 task view <taskId> plan/notes/summary shows text sections
- [x] #7 task view <taskId> ac/dod shows checked/unchecked checklist items
- [x] #8 task view <taskId> refs/deps/files shows list sections
- [x] #9 --json flag outputs raw data for every section
- [x] #10 task labels <taskId> remains as backward-compatible alias
- [x] #11 bun x tsc --noEmit passes, bun run check passes, bun test passes
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation

### File: `src/commands/task.ts`
1. **Add `viewTaskSection()` helper function** (top-level, before `registerTaskCommand`)
   - Normalizes section names (case-insensitive, ignores `_`/`-`)
   - `resolveData()` IIFE switches on normalized name, returns the raw field from Task
   - Falls back to `undefined` for unknown sections → error message with valid names list
   - `--json` → `JSON.stringify(data, null, 2)`
   - Plain text: switch on 14+ normalized section aliases, format each appropriately
   - Colored output: `●` dots for labels (via `resolveLabelColor`/`colorizeLabel`), `[x]`/`[ ]` with green/yellow for checklist items
   - Empty sections show dimmed "No X." messages

2. **Modify `view` command**: `.command("view <taskId> [section]")` 
   - With `section`: delegates to `viewTaskSection()`
   - Without `section`: same full-view behavior as before (TUI/plain/json)

3. **Simplify `labels` command**: delegates to `viewTaskSection(task, "labels", core, options)`
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
`task view <taskId> [section]` added with 14 section aliases (labels, status, assignee, milestone, desc, plan, notes, summary, ac, dod, refs, deps, files)

`viewTaskSection()` helper normalizes section names, renders plain text with colors or JSON

`task labels <taskId>` simplified to alias for `task view <taskId> labels`

Full-view backward compat preserved (no section = TUI/plain/json as before)

Biome+tsc clean, all 101 tests pass
<!-- SECTION:FINAL_SUMMARY:END -->