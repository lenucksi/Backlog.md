---
id: BACK-564
title: Cherry-pick MCP workspace root fix from upstream (BACK-558) + add AC
  numbers in browser view
status: To Do
assignee: []
created_date: 2026-06-17 10:39
updated_date: 2026-06-21 13:35
labels:
  - upstream
  - mcp
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/558
  - https://github.com/MrLesk/Backlog.md/pull/687
  - https://github.com/MrLesk/Backlog.md/issues/688
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/558 — MCP server writes to main repo instead of git worktree
- https://github.com/MrLesk/Backlog.md/pull/687 — Upstream fix: BACK-558 - Resolve MCP project root from client workspace roots
- https://github.com/MrLesk/Backlog.md/issues/688 — [Feature]: Add AC numbers to browser view

## What needs to happen

### Main item: MCP workspace root fix
The MCP server currently resolves its project root once at startup. In a git worktree or with a shared user-scope server, tasks get written to the wrong directory. The upstream PR #687 (by @mrkre, +392/-10, 6 files) fixes this by:
1. Adding pinned/unpinned root flag in `src/commands/mcp.ts` (--cwd / BACKLOG_CWD vs process.cwd())
2. Adding `startupHasProject` flag in `src/mcp/server.ts` — re-query roots on first request, re-check on roots/list_changed
3. Unifying the fallback and normal root resolution paths into request-scoped resolution
4. New test files: `src/test/mcp-workspace-root.test.ts`, `src/test/mcp-roots-discovery.test.ts`
5. README docs for workspace-following and --cwd pin

Our MCP server already has `enableRootsDiscovery()` — this extends it.

### Subtask: AC numbers in browser (#688)
Trivial change: switch `<ul>` to `<ol>` in the acceptance criteria rendering in `src/web/components/TaskDetailsModal.tsx` (around line 941) so ACs show numbered list items.

## Complexity
- MCP root fix: medium complexity — the upstream PR is clean but needs careful rebasing due to our 308-commit divergence
- AC numbers: trivial, single-line change

## Notes
- Cherry-picking is NOT a straight merge/rebase. Upstream's codebase has diverged significantly. Expect significant manual adaptation.
- The upstream PR #687 is currently OPEN — we may need to rework the approach if the PR changes.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->