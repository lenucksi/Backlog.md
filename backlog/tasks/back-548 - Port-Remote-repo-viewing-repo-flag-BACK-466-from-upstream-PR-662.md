---
id: BACK-548
title: "Port- Remote repo viewing (--repo flag, BACK-466 from upstream PR #662)"
status: To Do
assignee: []
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 12:37
labels:
  - port
  - cli
  - web
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/662
priority: medium
ordinal: 283000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the --repo flag for viewing remote repositories' backlog from upstream PR #662.

Architecture:
- New src/remote/remote-repo.ts: parseRemoteSpec, ensureRemoteRepo (shallow+blobless+sparse clone into ~/.backlog/remotes/...), authArgs
- CLI adaptation: add --repo/--ref/--no-refresh to board and browser commands (our fork uses src/commands/board.ts and src/commands/browser.ts, not monolithic cli.ts)
- Server: optional remoteSnapshot flag at GET /api/remote-snapshot
- Web: RemoteSnapshotBanner amber banner component
- Tests: src/test/remote-repo.test.ts

Note: This is orthogonal to our existing local git branch feature. They share only Core(projectRoot) and have no code overlap.

Upstream: https://github.com/MrLesk/Backlog.md/pull/662 (OPEN, CONFLICTING, +671/-7)

Port effort: ~50 lines CLI adaptation + 3 new files copy verbatim. Medium.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->