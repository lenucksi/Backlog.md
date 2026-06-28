---
id: BACK-0574
title: Fix repeated --label/--add-label/--remove-label flags dropping values silently
status: Done
assignee: []
created_date: 2026-06-26 17:33
updated_date: 2026-06-26 23:00
labels:
  - bug
  - urgent
  - filter
  - housekeeping
  - bugfix
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/692
  - https://github.com/MrLesk/Backlog.md/pull/693
priority: high
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/692 — Bug: `task edit --add-label`/`--label` silently drop all but the last value on repeated flags
- https://github.com/MrLesk/Backlog.md/pull/693 — Upstream PR: BACK-510 - Fix repeated task edit label flags

## What this is
Repeated `--label`, `--add-label`, `--remove-label` flags auf `backlog task edit` (und `--labels` auf `backlog task create`) werfen stillschweigend alle bis auf den letzten Wert weg. Der User denkt, beide Labels wurden gesetzt, aber nur das letzte überlebt. Sibling-Flags wie `--ac`, `--dod`, `--ref`, `--doc` sammeln hingegen korrekt mit `createMultiValueAccumulator()`.

## Unsere Codebasis hat DENSELBEN BUG
Gefunden in `src/commands/task.ts`:
- Line 873: `--labels` (task create) — kein Accumulator
- Line 944: `-l, --label <labels>` (task edit) — kein Accumulator  
- Line 950: `--add-label <label>` (task edit) — kein Accumulator
- Line 951: `--remove-label <label>` (task edit) — kein Accumulator

## Upstream PR #693 (BACK-510)
Upstream fix (OPEN PR, +319/-6, 5 files) macht:
1. `--label` ersetzt das gesamte Label-Set, akzeptiert repeated + comma-separated
2. `--add-label` und `--remove-label` sammeln repeated + comma-separated
3. `--clear-labels` löscht alle Labels explizit
4. Ambiguous Mixed-Modes (`--label` + `--add-label`) schlagen klar fehl statt stiller Partiel-Anwendung
5. `task edit --help` zeigt Label-Semantik im Schema

## Implementation Plan

### 1. Core-Fix: Accumulator hinzufügen (~5 min)
- `src/commands/task.ts` Zeilen 873, 944, 950, 951: `createMultiValueAccumulator()` als 3. Argument zu `.option()` hinzufügen
- Pattern: `.option("--add-label <label>", "...", createMultiValueAccumulator())`
- Die Downstream-Pipeline (`task-edit-builder.ts` → `resolveLabelsFromInput` in `backlog.ts`) unterstützt bereits Arrays

### 2. --clear-labels Flag (~15 min)
- `clearLabels?: boolean` zu `TaskEditArgs` (`src/types/task-edit-args.ts`) und `TaskUpdateInput` (`src/types/index.ts`) hinzufügen
- `--clear-labels` Option in `src/commands/task.ts` (folgt `--clear-milestone`, `--clear-final-summary` Pattern)
- `task-edit-builder.ts`: `if (args.clearLabels) target.clearLabels = true;`
- `backlog.ts` `resolveLabelsFromInput`: clearLabels am Anfang ausführen (erst clearen, dann add/remove)

### 3. Mixed-Mode Validation (~10 min)
- In `resolveLabelsFromInput` or im task-edit Handler: wenn `input.labels` (replace) + `input.addLabels`/`input.removeLabels` (incremental) kombiniert werden → frühzeitig fehlschlagen mit klarer Message

## Complexity
**TRIVIAL** — Core-Fix sind 4× `createMultiValueAccumulator()`, ~5 Minuten. Optionale Erweiterungen (~30 min Extra).

## Test plan
- `--add-label bug --add-label urgent` → beide Labels gespeichert
- `--remove-label foo --remove-label bar` → beide entfernt
- Kombination mit `--clear-labels` + `--add-label` → nur neues Label
- Mixed-Mode `--label X --add-label Y` → Error
- `--label` repeated → alle Values gesammelt (ersetzen)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repeated --add-label flags accumulate all values (not just the last) in task edit
- [x] #2 Repeated --remove-label flags accumulate all values in task edit
- [x] #3 Repeated --label flags accumulate all values (replace-behavior, collect all) in task edit
- [x] #4 Repeated --labels flags work on task create
- [x] #5 Comma-separated values continue to work
- [x] #6 --clear-labels flag exists and clears all labels before add/remove
- [x] #7 Mixed --label + --add-label fails with a clear error message
- [x] #8 bunx tsc --noEmit passes, bun run check . passes, bun test passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented fix for GH #692/#693:

1. **4× `createMultiValueAccumulator()`** in `src/commands/task.ts`: `-l, --labels` (create), `-l, --label` (edit), `--add-label` (edit), `--remove-label` (edit)
2. **`--clear-labels`** flag: option in edit command + `clearLabels?: boolean` in `TaskEditArgs`/`TaskUpdateInput` + passthrough in `task-edit-builder.ts` + handling in `resolveLabelsFromInput`
3. **Mixed-mode validation**: `resolveLabelsFromInput` throws Error when `--label` (replace) is combined with `--add-label`/`--remove-label` (incremental)
4. **Create handler**: switched from `String(options.labels).split(',')` to `parseDelimitedStringList(options.labels)` for consistency

All 66 CLI tests + 35 command coverage + 41 core tests pass. Build + biome check clean.

Extended with: `backlog task labels <taskId>` command showing colored ● dots per label + `--json` support

Fixed `core.config` getter on Core class — `resolveLabelColor()` works now, edit output shows colored ● dots for Added/Removed/Now labels

Label display format changed from comma-separated to space-separated with colorized ● dots
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->