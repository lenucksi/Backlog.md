---
id: BACK-533
title: HTTP-Fehler in Git network error patterns erkennen (503 etc.)
status: Done
assignee: []
created_date: '2026-05-24 09:44'
labels:
  - bug
  - git
  - networking
milestone: m-15
dependencies: []
modified_files:
  - src/git/operations.ts
  - src/test/offline-mode.test.ts
priority: high
ordinal: 256000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`containsNetworkErrorPattern` erkannte nur Netzwerk-Fehler auf TCP/IP-Ebene wie "connection refused" oder "timeout", aber nicht HTTP-Error-Codes (4xx/5xx). Wenn `git fetch` einen 503 (oder 502, 403, etc.) zurückgab, wurde der Error nicht als Netzwerkfehler erkannt, wieder geworfen, und legte das gesamte CLI lahm.

**Fix:** Pattern `"the requested url"` zur Liste in `containsNetworkErrorPattern` in `src/git/operations.ts` hinzugefügt. Git meldet HTTP-Fehler als `"The requested URL returned error: NNN"`.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->
