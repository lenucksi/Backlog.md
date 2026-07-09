---
id: BACK-0620
title: Support `backlog browser --base-path` for reverse-proxy deployments
status: To Do
assignee: []
created_date: 2026-07-04 20:10
labels:
  - upstream
  - feature
  - browser
  - server
  - config
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/716
priority: low
ordinal: 410000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upstream issue #716 (closed by Alex Agent as "not planned"). Add a `--base-path` option to `backlog browser` so it can be served behind a reverse proxy under a path prefix (e.g. `/projects/repo-a/backlog/`). Default stays `/`.

This would be useful for multi-backlog single-origin dashboards, Tailscale/SSH-tunneled services, and dev container port-forwarding where exposing per-project child ports is undesirable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Default base path `/` unchanged
- [ ] #2 Browser UI loads from non-root base path
- [ ] #3 API routes work under base path
- [ ] #4 Assets/favicon resolve under base path
- [ ] #5 WebSocket connection uses base path
- [ ] #6 Invalid --base-path values rejected
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->