---
id: BACK-519.6
title: 'BACK-519.7 — Wiki web UI (PR #647 BACK-473 portion)'
status: To Do
assignee: []
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 15:12'
labels:
  - upstream
  - feature
  - webui
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/647'
parent_task_id: BACK-519
priority: low
ordinal: 228000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Wiki web UI with file tree navigation and markdown content viewing. Only the BACK-473 portion of PR #647 by kuwork.

## Not included
- Wiki install command (BACK-474) — conflicts with existing agents.ts commands
- Skill embedding (BACK-477) — not needed

## Key components
- WikiDetail.tsx: read-only markdown viewer
- SideNavigation.tsx: collapsible wiki file tree
- Server handlers: wiki API endpoints
- FileSystem methods: getWikiTree(), readWikiPage()

## Implementation plan
1. Add FileSystem.getWikiTree() and readWikiPage()
2. Create server handlers in src/server/handlers/wiki.ts
3. Port WikiDetail component
4. Port wiki tree in SideNavigation
5. Register /wiki route
6. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
