---
id: BACK-546
title: "Port- UTC date display consistency (BACK-471 from upstream PR #672)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - cli
  - mcp
  - tui
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/672
priority: low
ordinal: 281000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port shared UTC date display formatter from upstream PR #672. Adds src/utils/utc-date-display.ts (69 lines) that normalizes dates and appends "(UTC)" to CLI plain output and MCP text surfaces. Routes TUI comment dates through the formatter.

Changes: 10 files touched but all are small (add import + wrap existing call). Stored markdown is never rewritten — display only.

Upstream: https://github.com/MrLesk/Backlog.md/pull/672 (OPEN, +227/-20)

Port effort: ~15 minutes. Very low risk.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->