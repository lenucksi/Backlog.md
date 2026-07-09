---
id: DRAFT-0017
title: Refactor BE to Go/Rust and keep FE + Package up the entire thing
status: Draft
assignee: []
created_date: 2026-07-03 12:43
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
unten alles go oder rust machen und oben lassen und dann zusammenpacken

das skillshare ding hat das gemacht und auch devsetup dafür
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->