---
id: BACK-529.6
title: 'BACK-529.6 — Frontmatter: status "Archived" setzen beim Archivieren'
status: To Do
assignee: []
created_date: '2026-05-22 18:42'
labels:
  - fix
  - data-integrity
milestone: m-13
dependencies: []
parent_task_id: BACK-529
priority: medium
ordinal: 251000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`fs.completeTask()` verschiebt Dateien ROH — der Frontmatter-Status bleibt was immer er vorher war. Archivierte Tasks müssen erkennbar anders sein als "nur Done".

## What
- `fs.completeTask()`: Nach dem Verschieben nach `archive/tasks/`, Frontmatter parsen und `status: "Archived"` setzen
- Task ist optisch unterscheidbar: `status: "Archived"` statt `status: "Done"`
- Kein Reopen möglich (wird in .7 abgefangen)

## Implementation plan
1. `operations.ts`: `completeTask() → moveFile → readFrontmatter → setStatus("Archived") → writeFile`
2. `bunx tsc --noEmit`
3. `bun run check .`
4. `bun test`

## Files
- `src/file-system/operations.ts`

## Dependencies
- BACK-529.1 (completeTask Ziel auf archive/tasks/)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
