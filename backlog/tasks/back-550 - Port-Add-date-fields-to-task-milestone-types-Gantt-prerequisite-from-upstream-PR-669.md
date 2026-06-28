---
id: BACK-550
title: "Port- Add date fields to task/milestone types (Gantt prerequisite, from
  upstream PR #669)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - types
  - server
  - gantt
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/669
priority: medium
ordinal: 285000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prerequisite for GanttView port. Add 5 optional date fields to Task and Milestone types, plus accompanying changes for round-trip markdown serialization and server schemas.

Fields to add:
- dueDate (Date | null) — deadline
- plannedStart (Date | null) — planned start
- plannedEnd (Date | null) — planned end
- actualStart (Date | null) — actual start (auto-populate on status change)
- actualEnd (Date | null) — actual end (auto-populate on completion)

Files to modify:
- src/types/index.ts: Task + Milestone + CreateInput + UpdateInput types
- src/markdown/parser.ts: parse new fields from frontmatter
- src/markdown/serializer.ts: serialize new fields to frontmatter
- src/server/index.ts: accept in API payloads
- src/web/lib/api.ts: accept in API requests
- src/mcp tools: expose in schemas

Optionally: auto-populate actualStart on first non-todo status, actualEnd on completion.

Upstream: BACK-401, BACK-492, BACK-493 from https://github.com/MrLesk/Backlog.md/pull/669

Port effort: ~50 lines across types + parser + serializer. Low-Medium.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->