---
id: BACK-516
title: 'Feature Parity: Tool parity gaps (doc-005 follow-up)'
status: Done
assignee: []
created_date: '2026-05-21 16:02'
updated_date: '2026-05-22 15:40'
labels:
  - parity
  - cli
  - mcp
  - feature
milestone: m-14
dependencies: []
priority: medium
ordinal: 206000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for closing smaller parity gaps identified in doc-005 (Feature Parity Matrix):

**Subtasks:**
- .01: CLI: `task complete <id>` — sugar for `task edit <id> --status Done`
- .02: CLI: `backlog stats` — expose statistics via CLI with --plain / --json output
- .03: CLI + MCP: Document archive/delete — implement doc lifecycle management

Referenced by doc-005 stubs P3 (task complete), P4 (statistics CLI), P5 (document archive).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
