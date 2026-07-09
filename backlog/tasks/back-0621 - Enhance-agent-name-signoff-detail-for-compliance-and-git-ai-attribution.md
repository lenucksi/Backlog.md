---
id: BACK-0621
title: Enhance agent name/signoff detail for compliance and git-ai attribution
status: To Do
assignee: []
created_date: 2026-07-04 20:10
labels:
  - upstream
  - enhancement
  - agents
  - quality
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/144
priority: medium
ordinal: 411000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upstream issue #144 (triaged by Alex Agent, kept open as "small instruction/config candidate"). Add more detail to agent name/signoff — who did what, when, and what deliberation produced the result. This connects with git-ai for compliance/audit trails and has potential commercial/sellable aspects.

The upstream issue discusses capturing human work, creativity, and deliberation that went into code/decisions, linking to tools like git-ai.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Agent signoff includes timestamp and actor identity
- [ ] #2 Optional deliberation/source context in signoff
- [ ] #3 Format compatible with downstream compliance tooling (git-ai etc.)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->