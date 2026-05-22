---
id: BACK-516.3
title: 'Parity: CLI + MCP document archive/delete'
status: Done
assignee: []
created_date: '2026-05-21 16:03'
updated_date: '2026-05-22 01:28'
labels:
  - parity
  - cli
  - mcp
dependencies: []
modified_files:
  - src/file-system/operations.ts
  - src/cli.ts
  - src/mcp/tools/documents/handlers.ts
parent_task_id: BACK-516
priority: medium
ordinal: 213000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement document lifecycle management. Currently there is NO way to archive or delete documents in any modality.

Implementation plan:
1. **CLI:** `backlog doc archive <id>` — moves document to `backlog/archive/docs/`
   - Uses existing FileSystem archive pattern (see `archiveTask()` for reference)
   - Output confirms archive with old path → new path
2. **CLI:** `backlog doc delete <id>` — hard deletes a document
   - Confirmation prompt (`--force` to skip)
3. **MCP:** `document_archive` tool — mirrors CLI behavior

Design decision: Archive moves the file (reversible), Delete removes it permanently. Archive is the default lifecycle path; Delete is for mistakes.

Implementation plan:
1. Add `archiveDocument()` to `src/file-system/operations.ts`
2. Add `deleteDocument()` to `src/file-system/operations.ts`  
3. Add `doc archive` / `doc delete` CLI sub-commands
4. Add MCP `document_archive` and optionally `document_delete` tools
5. Tests for both operations: archive round-trip, delete, error cases
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 backlog doc archive <id> moves document to archive
- [ ] #2 #2 backlog doc delete <id> removes document permanently
- [ ] #3 #3 MCP has document_archive tool
- [ ] #4 #4 Confirm prompt for delete (--force to skip)
- [ ] #5 #5 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
