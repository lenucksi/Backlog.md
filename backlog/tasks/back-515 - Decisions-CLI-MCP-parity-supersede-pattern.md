---
id: BACK-515
title: 'Decisions: CLI/MCP parity + supersede pattern'
status: Done
assignee: []
created_date: '2026-05-21 16:02'
updated_date: '2026-05-22 15:40'
labels:
  - decisions
  - parity
  - cli
  - mcp
  - web-ui
  - feature
milestone: m-14
dependencies: []
priority: medium
ordinal: 205000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for bringing decisions to feature parity across CLI and MCP, with the supersede pattern (RFC-style):

**Supersede pattern** (instead of edit):
- `decision supersede <old-id>` creates a new decision that supersedes the old one
- Old decision gets: status → "superseded", `superseded-by: <new-id>` in frontmatter
- New decision gets: status → "accepted", `supersedes: <old-id>` in frontmatter
- Both show clickable cross-links in WebUI/TUI

**Current state** (from doc-005):
- CLI: only `decision create` exists
- MCP: no decisions tools at all
- WebUI: full CRUD for decisions (but no supersede links)
- Type model: has `"superseded"` status but no linking fields

**Subtasks:**
- .01: Decision model: add supersedes/supersededBy fields + serializer/deserializer
- .02: CLI: decision list, view, supersede commands
- .03: MCP: decisions domain tools (list, view, supersede)
- .04: WebUI: show supersede links in decisions view

Referenced by doc-005 stubs P1 (decisions CLI) and P2 (decisions MCP).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
