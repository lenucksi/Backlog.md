---
id: BACK-549
title: "Port- Task comments across all modalities (BACK-470 from upstream PR #668)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - cli
  - mcp
  - web
  - tui
  - server
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/668
priority: high
ordinal: 284000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port structured task comments feature from upstream PR #668. This is the largest porting effort.

Architecture:
- CommentsManager in src/markdown/structured-sections.ts: compact delimiter format (<!-- COMMENTS:BEGIN --> / <!-- COMMENTS:END -->), legacy marker support, parse/serialize
- Types: TaskComment, TaskCommentInput in types/index.ts, appendComments on TaskUpdateInput
- CLI: --comment and --comment-author flags on task edit (adapt to our src/commands/task.ts)
- MCP: commentsAppend + commentAuthor on task_edit schema
- Web UI: comment display (read-only in preview), add-comment form in edit mode
- TUI: comment rendering with index/author/date header
- Server API: accept commentsAppend in PUT /api/tasks/:id
- Search: index comment body text

Key divergences to handle:
1. Our cli.ts is 177-line bootstrapper → put flags in src/commands/task.ts
2. TaskDetailsModal.tsx heavily customized → hand-integrate comment UI
3. src/markdown/structured-sections.ts already 711 lines → careful merge of CommentsManager

Upstream: https://github.com/MrLesk/Backlog.md/pull/668 (MERGED, +1896/-28, 35 files)

Port effort: ~400-600 lines across ~12 source files. Highest effort port.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->