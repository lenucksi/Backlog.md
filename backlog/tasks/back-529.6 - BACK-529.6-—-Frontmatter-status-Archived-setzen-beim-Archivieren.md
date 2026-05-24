---
id: BACK-529.6
title: 'BACK-529.6 — Frontmatter: status "Archived" setzen beim Archivieren'
status: Done
assignee: []
created_date: '2026-05-22 18:42'
updated_date: '2026-05-24 13:20'
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
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 completeTask() setzt status:"Archived" nach moveFile
- [x] #2 Task in archive/tasks/ hat Archived statt altem Status im Frontmatter
- [x] #3 Keine tsc/check Fehler
<!-- AC:END -->



## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
`fs.completeTask()` in operations.ts: Nach `rename(sourcePath, targetPath)` wird die Datei via `Bun.file(targetPath).text() + matter(content)` eingelesen, `parsed.data.status = "Archived"` gesetzt, und via `matter.stringify()` zurückgeschrieben. `matter` (gray-matter) war bereits importiert.

Serena-Tool: serena_replace_symbol_body(FileSystem/completeTask) in operations.ts
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
`fs.completeTask()` in operations.ts: nach dem moveFile wird das Frontmatter via gray-matter geparst und `status: "Archived"` gesetzt, bevor die Datei zurückgeschrieben wird. Der Task ist jetzt optisch unterscheidbar (`status: "Archived"` statt `status: "Done"`).
<!-- SECTION:FINAL_SUMMARY:END -->
