---
id: BACK-0593
title: BACK-593 - Build Pipeline Audit Cleanup
status: To Do
assignee: []
created_date: 2026-06-28 09:51
updated_date: 2026-06-28 10:12
labels:
  - build
  - vite
  - bun
  - devops
milestone: m-13
dependencies: []
priority: high
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context

The Backlog.md build pipeline was recently migrated from Bun native bundler to Vite 8.1 for frontend + `bun build --compile` for binary. A comprehensive audit (docs/audits/build-pipeline-audit-2026-06.md) identified 14 findings across 4 severity levels.

## Scope

This parent task tracks cleanup of all findings:

| Priority | Count | Items |
|----------|-------|-------|
| P0 - Silent failure | 1 | 593.1  |
| P1 - Anti-patterns | 6 | 593.2, 593.3, 593.4, 593.5, 593.6, 593.7 |
| P2 - Regression prevention | 1 | 593.8 |
| P3 - Architectural | 2 | 593.9, 593.10 |

## References

- Full audit: docs/audits/build-pipeline-audit-2026-06.md
- Blank page bug root cause: docs/troubleshooting/blank-page-after-vite-build.md
- Subagent research report: docs/subagent-research-reports/build-pipeline-analysis-full.md
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All subtasks are closed or have a clear path forward
- [ ] #2 bun run build completes successfully end-to-end
- [ ] #3 npm i -g . and ./dist/backlog browser both work
- [ ] #4 bun run dev starts Vite HMR + API server
- [ ] #5 bun run check . passes on all touched files
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Execute subtasks in priority order:
1. 593.1 (P0, 5min) - jq replacement
2. 593.7 (P1, 15min) - package.json cleanup
3. 593.6 (P1, 15min) - MIME fix + asset routing
4. 593.4 (P1, 15min) - parallelize builds
5. 593.5 (P1, 30min) - remove concurrently
6. 593.3 (P1, 30min) - Vite JS API
7. 593.2 (P1, 1-2h) - Tailwind path
8. 593.8 (P2, 2-3h) - CI validation
9. 593.9 (P3, 4-8h) - embed assets
10. 593.10 (P3, 4-8h) - merge routing

Items 1-7 can be done independently by different agents.
Items 8 needs items 3+6 as prereq.
Items 9-10 are follow-up.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The blank page bug (June 2026) was a high-severity symptom of finding #9 (external/transform overlap). The fix was removing build.rollupOptions.external: [/\.md$/] and adding a backlog-markdown transform plugin. This class of bug can recur if external patterns overlap with custom transform extensions. Task 593.8 adds CI validation to prevent this.
<!-- SECTION:NOTES:END -->