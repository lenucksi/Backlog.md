---
id: BACK-547
title: "Port- TUI theme-adaptive rendering and scroll improvements (BACK-469
  from upstream PR #670)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - tui
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/670
priority: medium
ordinal: 282000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port TUI rendering improvements from upstream PR #670.

Changes:
1. Replace hardcoded ANSI colors (fg:"white", bg:"blue") with inverse+video across all TUI components
2. Add scroll improvements: PGUP/PGDN/Home/End keys, scrollbar indicators, shared addScrollKeys() helper
3. Fix filter navigation edge cases (down exits only at last item)
4. Status icon colors: "white" → "default" for theme compatibility

Files: 14 TUI source files + 3 test files + tools/tui-screenshot-compare.sh (optional)

Upstream: https://github.com/MrLesk/Backlog.md/pull/670 (MERGED, +816/-46)

Port effort: Medium. Many files, but mechanical changes (find/replace patterns).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->