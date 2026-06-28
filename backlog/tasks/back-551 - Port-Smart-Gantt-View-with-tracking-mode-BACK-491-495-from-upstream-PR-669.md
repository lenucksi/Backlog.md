---
id: BACK-551
title: "Port- Smart Gantt View with tracking mode (BACK-491/495 from upstream PR
  #669)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - web
  - gantt
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/669
priority: medium
ordinal: 286000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the interactive Gantt chart component from upstream PR #669. Gantt is complementary to our existing Sequences feature (topological ordering) — Gantt answers "when", sequences answer "what can I parallelize".

Porting strategy:
1. Port GanttView.tsx (~650 lines) with i18n stripped — replace all (t as any).gantt.* with hardcoded English strings (~20 line changes)
2. Add groupSubtasksUnderParents() to task-sorting.ts (~40 lines)
3. Register /gantt route in App.tsx + SideNavigation entry
4. Tests

Feature: Interactive Gantt with zoom (day/week/month/quarter/year), drag-to-scroll, today marker, dependency arrows, plan-vs-actual tracking mode, dark mode.

Note: Depends on BACK-XXX (date fields task) being done first for data to render.

Upstream: BACK-491, BACK-495 from https://github.com/MrLesk/Backlog.md/pull/669

Port effort: Medium. GanttView.tsx port + type dependency. NOT porting: i18n system, wiki, docx, sidebar resize (orthogonal features in the same monster PR).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->