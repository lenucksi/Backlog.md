---
id: BACK-539
title: Audit and refactor test suite against best practices
status: To Do
assignee: []
created_date: 2026-06-03 17:02
updated_date: 2026-06-08 10:15
labels:
  - test
dependencies: []
references:
  - "doc-15: Testing Best Practices & Philosophy"
  - "doc-16: Test Suite Audit — Rating & Improvement Plan"
ordinal: 263000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and refactor the entire test suite in src/test/ against the Testing Best Practices & Philosophy guide (doc-15). The Audit document (doc-16) provides detailed ratings, issues, and improvement plans for all 198 test files across 5 modalities.

Work through the refactoring plan in Phases. Each phase produces a working test suite with no regressions. Run `bun test` before and after each phase to verify.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 198 test files are categorized (keep/refactor/delete) per the audit rubric
- [ ] #2 P0 issues resolved: TUI popup triplet merged, git.test.ts fixed, private method access eliminated, shouldRebuildColumns consolidated, cli-coverage.test.ts improved
- [ ] #3 P1 issues resolved: cli.test.ts split, backlog-coverage.test.ts split, setTimeout usage reduced, missing afterEach cleanup added, mkdtemp → createUniqueTestDir migration complete
- [ ] #4 All uncovered code paths in refactored files still pass
- [ ] #5 bun test passes with no regressions after each phase
- [ ] #6 bunx tsc --noEmit passes with no errors
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
2026-06-08: Completed Phase 3 item 2 — Playwright E2E setup (doc-17). 5 E2E tests passing covering board rendering, assignee/priority filtering, modal interaction, milestone search. Created playwright.config.ts, scripts/e2e-test-server.ts, src/test/e2e/critical-journeys.test.ts. Updated doc-15 (appended section 2.6 + Appendix A), doc-16 (marked Phase 3.2 done + updates section), doc-001 (appended E2E patterns section). Key findings: task prefix must match glob pattern, port kill must happen before Playwright preflight check, locator disambiguation for modal headings.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 Test suite passes before and after each refactoring phase
- [ ] #6 No test files deleted without verifying coverage is preserved elsewhere
- [ ] #7 All new test files follow the patterns in doc-15 (AAA, behavioral, no private access)
- [ ] #8 Document any files intentionally left unaddressed with rationale
<!-- DOD:END -->