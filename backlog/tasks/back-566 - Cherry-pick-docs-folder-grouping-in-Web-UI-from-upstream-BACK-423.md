---
id: BACK-566
title: Cherry-pick docs folder grouping in Web UI from upstream (BACK-423)
status: To Do
assignee: []
created_date: 2026-06-17 10:39
updated_date: 2026-06-21 13:35
labels:
  - upstream
  - webui
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/488
  - https://github.com/MrLesk/Backlog.md/pull/674
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/488 — [Feature]: Folders for Docs
- https://github.com/MrLesk/Backlog.md/pull/674 — BACK-423 - Add folder grouping for docs in Web UI (PR by kuwork, currently OPEN)

## What this is
Adds a collapsible folder tree in the Web UI sidebar for docs organized by path. Key changes from upstream:
- `src/web/lib/docs-tree.ts` — helper function to build hierarchical tree structure from docs (sorted alphabetically, any depth)
- `src/web/lib/docs-tree.test.ts` — 8 unit tests
- `src/web/components/SideNavigation.tsx` — collapsible folder tree with localStorage persistence for collapsed state
- `src/web/styles/style.css` — minor styling

Features:
- Full hierarchy tree — nested folders like guides > auth > basic (any depth)
- Alphabetical sorting of folders and docs
- Collapse/expand per folder with localStorage persistence
- Flat list for ungrouped docs (docs without path appear below folder tree)
- Flat search results (search bypasses folder grouping)
- Empty folders hidden
- Edge cases: missing path, deeply nested, malformed paths

## Complexity
MEDIUM — smaller scope than #686, but still touches SideNavigation.tsx which we've diverged on. Our SideNavigation.tsx has a different structure (archived docs, completed tasks sections, different layout). Expect manual adaptation.

## Notes
- Cherry-picking is NOT a straight merge/rebase. Upstream PR is by a contributor (kuwork) and may need code quality review.
- The upstream PR is currently OPEN — we may need to adapt if the PR changes
- Our fork has the commit series in `remotes/origin/pr669/*` branches but they were never merged into our main
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->