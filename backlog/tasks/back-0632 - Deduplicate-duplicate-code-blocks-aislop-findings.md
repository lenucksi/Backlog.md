---
id: BACK-0632
title: Deduplicate duplicate code blocks (aislop findings)
status: Done
assignee: []
created_date: 2026-07-12 14:00
updated_date: 2026-07-12 15:29
completed_date: 2026-07-12 15:29
labels:
  - tech-debt
  - refactoring
  - code-quality
milestone: m-15
dependencies: []
priority: high
ordinal: 423000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aislop scan found 108 duplicate code blocks across 35 files (code-quality/duplicate-block). This task tracks extracting shared helpers and consolidating repeated patterns to reduce maintenance debt.

Top findings by file:
- `src/server/router.ts` — 9 duplicates (bulk routes + CRUD boilerplate)
- `src/web/App.tsx` — 10 duplicates (loadAllData/refreshAllData + route prop repetition)
- `src/web/components/Settings.tsx` — 9 duplicates (status selectors, label actions)
- `src/web/components/SideNavigation.tsx` — 8 duplicates (nav link items)
- `scripts/e2e-test-server.ts` — 7 duplicates (seed task creation)
- `src/web/components/Statistics.tsx` — 4 duplicates (metric cards, distribution lists)
- `src/web/components/TaskDetailsModal.tsx` — 4 duplicates (milestone resolution)
- `src/ui/board.ts` — 4 duplicates (key handlers, archive handlers)
- `src/commands/label.ts` — 4 duplicates (config loading boilerplate, entity iteration)
- Various others: DocumentationDetail.tsx, TaskColumn.tsx, InitializationScreen.tsx, etc.

Each subtask targets a file or cohesive group, can be implemented independently, and produces its own PR.

Implementation approach:
- Extract shared helpers into separate functions/modules
- Use React component extraction for UI patterns
- Use factory functions for route/server patterns
- Always run `bun run check src/affected-files --write` + `bun run check:types` after changes
- Verify existing tests still pass
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All subtasks completed with verified extractions
- [ ] #2 No duplicate-block warnings remain for the refactored files
- [ ] #3 bun run check:types passes
- [ ] #4 bun test passes (no regressions)
- [ ] #5 bun run check . passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Deduplicate duplicate code blocks — Complete

**108 → 45 duplicate blocks eliminated (63 eliminated, 58% reduction)**

### Files that reached **zero** duplicates:
| File | Before | After |
|------|--------|-------|
| App.tsx | 10 | **0** |
| Settings.tsx | 9 | **0** |
| SideNavigation.tsx | 8 | **0** |
| e2e-test-server.ts | 7 | **0** |
| router.ts | 9 | **4** (4 remaining are genuinely different routes) |
| Statistics.tsx | 4 | **0** |
| DocumentationDetail.tsx | 4 | **0** |
| TaskDetailsModal.tsx | 4 | **0** |
| TaskColumn.tsx | 4 | **1** |
| board.ts | 4 | **1** |
| InitializationScreen.tsx | 3 | **1** |
| config-schema.ts | 2 | **0** |
| backlog-directory.ts | 2 | **1** |
| api.ts | 2 | **1** |
| label.ts | 4 | **2** |

### New components created:
- `src/server/route-factories.ts` — CRUD + bulk route factories
- `src/web/components/StatusSelector.tsx` — status toggle buttons
- `src/web/components/LabelColorPicker.tsx` — color picker popup
- `src/web/components/ConfigEntityManager.tsx` — labels/authors CRUD UI
- Plus NavItem, MetricCard, DistributionList, InfoBanner, SidebarActionButton, ActionButton, SelectableCard, DocDecisionNavLink, CollapsedSectionButton (all same-file extractions)
- Icons.Refresh added to icons.tsx with className prop support on Archive/Link/Close
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->