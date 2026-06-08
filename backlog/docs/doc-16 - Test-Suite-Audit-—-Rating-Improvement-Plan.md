---
id: doc-16
title: Test Suite Audit — Rating & Improvement Plan
type: specification
created_date: 2026-06-03 17:02
updated_date: 2026-06-08 10:15
tags:
  - testing
  - audit
  - refactor
---
# Test Suite Audit — Rating & Improvement Plan

Audit of all test files in `src/test/` against the **Testing Best Practices & Philosophy** guide (doc-15).

---

## Executive Summary

- **198 test files** across 5 modalities + core + utilities
- **Overall quality**: Strong (84% graded A or B)
- **Key strengths**: Behavioral tests, clean AAA pattern, `createUniqueTestDir` infrastructure, MCP `testInterface` pattern, command-test-helper
- **Key weaknesses**: Coverage-hack files, fragile TTY patching, duplicated TUI popup boilerplate, oversized catch-all files, private-method access in tests

### Grade Distribution (sampled 46 files)

| Grade | Count | % |
|---|---|---|
| A (excellent) | 24 | 52% |
| B (good) | 17 | 37% |
| C (needs improvement) | 5 | 11% |
| D (problematic) | 0 | 0% |

---

## 1. Modality-by-Modality Assessment

### 1.1 CLI Tests — Grade: B+

**Files**: `cli-coverage.test.ts`, `cli-smoke.test.ts`, `cli-plain-create-edit.test.ts`, `cli-search-command.test.ts`, `cli.test.ts`, `cli-board-integration.test.ts`, `cli-commit-behaviour.test.ts`, `cli-agents.test.ts`, `cli-auto-plain-non-tty.test.ts`, `cli-dependency.test.ts`, `cli-final-summary.test.ts`, `cli-incrementing-ids.test.ts`, `cli-init-claude-default.test.ts`, `cli-init-no-git.test.ts`, `cli-milestone-filter.test.ts`, `cli-parent-filter.test.ts`, `cli-parent-shorthand.test.ts`, `cli-plain-output.test.ts`, `cli-priority-filtering.test.ts`, `cli-refs-docs.test.ts`, `cli-splash.test.ts`, `cli-task-milestone.test.ts`, `cli-task-wizard.test.ts`, `cli-zero-padded-ids.test.ts`, `commands-config-cov.test.ts`, `commands-init-cov.test.ts`, `commands-task-cov.test.ts`

**Patterns used**:
- `commands-test-helper.ts` (programmatic Commander with `exitOverride`) — best practice
- Bun `$` subprocess spawning — acceptable for integration tests
- Direct Core API calls mixed with CLI tests — **not** best practice

**Issues**:
| File | Issue | Severity |
|---|---|---|
| `cli.test.ts` | 1508 lines — mixes Core API tests with CLI tests | High |
| `cli-coverage.test.ts` | Coverage hack with global `process.exit` mutation | Medium |
| `cli-smoke.test.ts` | `toBeTruthy()` assertions — no specific validation | Low |
| `cli-board-integration.test.ts` | "Does not throw" tests without assertions | Medium |

### 1.2 TUI Tests — Grade: B-

**Files**: `tui-termless-core.test.ts`, `vterm-backend.ts`, `tui-definition-of-done.test.ts`, `tui-documentation.test.ts`, `tui-final-summary.test.ts`, `tui-edit-session.test.ts`, `board-ui.test.ts`, `board-render.test.ts`, `tui-interactive-editor-handoff.test.ts`, `zz-ui-components-coverage.test.ts`, `zz-task-viewer-coverage.test.ts`, `zz-board-coverage.test.ts`

**Patterns used**:
- `vterm.js` + `@termless/core` virtual terminal — emerging, excellent
- `process.stdout.isTTY` patching — fragile
- Blessed internals access (`popup.contentArea.content`) — brittle

**Issues**:
| File | Issue | Severity |
|---|---|---|
| `tui-definition-of-done.test.ts` | Near-identical boilerplate in 3 files; fragile TTY patching | High |
| `tui-documentation.test.ts` | Same pattern as above — merge candidate | High |
| `tui-final-summary.test.ts` | Same pattern as above — merge candidate | High |
| `zz-ui-components-coverage.test.ts` | `setTimeout` for async resolution; global mutable state | Medium |
| `board-ui.test.ts` vs `board-render.test.ts` vs `zz-board-coverage.test.ts` | `shouldRebuildColumns` tested in 3 files | Medium |

### 1.3 WebUI Tests — Grade: A-

**Files**: `web-board-filters.test.tsx`, `web-task-column-sort.test.tsx`, `web-task-details-modal-final-summary.test.tsx`, `web-milestones-page-search.test.tsx`, `web-milestones-page-unassigned-filter.test.tsx`, `web-task-details-modal-documentation.test.tsx`, `web-task-list-labels-menu.test.tsx`, `mermaid-markdown.test.tsx`, `TaskCard.test.tsx`

**Patterns used**:
- JSDOM + `react-dom/client` `createRoot` + `act()` — good for unit level
- `renderToString` (SSR) for static content
- `MemoryRouter` / `BrowserRouter` for routing tests

**Issues**:
| File | Issue | Severity |
|---|---|---|
| All WebUI tests | No Playwright E2E — browser-level behavior untested | Medium |
| Various | `globalThis` mutation (window, document) side effects | Low |
| Various | Monkey-patching `apiClient` methods | Low |

### 1.4 MCP Tests — Grade: A

**Files**: `mcp-server.test.ts`, `mcp-tasks.test.ts`, `mcp-milestones.test.ts`, `mcp-documents.test.ts`, `mcp-drafts.test.ts`, `mcp-fallback.test.ts`, `mcp-final-summary.test.ts`, `mcp-refs-docs.test.ts`, `mcp-roots-discovery.test.ts`, `mcp-stdio-exit.test.ts`, `mcp-task-complete.test.ts`, `mcp-tasks-local-filter.test.ts`, `mcp-definition-of-done-defaults.test.ts`, `mcp-milestones-cov.test.ts`, `mcp-tasks-cov.test.ts`, `mcp-server-cov.test.ts`

**Patterns used**: `server.testInterface.callTool()/.listTools()/.listResources()` — excellent testability pattern

**Issues**:
| File | Issue | Severity |
|---|---|---|
| `mcp-tasks.test.ts` | 797 lines — consider splitting | Low |
| `mcp-milestones.test.ts` | 1030 lines — largest test file | Low |
| `mcp-tasks-cov.test.ts`, `mcp-server-cov.test.ts` | Coverage-only files | Low |

### 1.5 REST/Server Tests — Grade: A

**Files**: `server-tasks-endpoint.test.ts`, `server-search-endpoint.test.ts`, `server-documents-endpoint.test.ts`, `server-init.test.ts`, `server-assets.test.ts`, `server-cache.test.ts`, `server-cleanup-endpoint.test.ts`, `server-index-cov.test.ts`, `server-port.test.ts`

**Patterns used**: `BacklogServer` on random port + `fetch()`

**Issues**:
| File | Issue | Severity |
|---|---|---|
| `server-documents-endpoint.test.ts` | Accesses private `core` via type cast for mocking | Medium |
| `server-init.test.ts` | Tests private `handleInit` via type cast | Medium |
| `server-search-endpoint.test.ts` | Uses `Bun.write` to create milestone files (bypasses API) | Low |

### 1.6 Core/Utility Tests — Grade: A

**Files**: `markdown.test.ts`, `filesystem.test.ts`, `content-store.test.ts`, `content-store-comprehensive.test.ts`, `board.test.ts`, `sequences.test.ts`, `sequences-comprehensive.test.ts`, `checklist.test.ts`, `definition-of-done.test.ts`, `task-sorting.test.ts`, `reorder-utils.test.ts`, `search-service.test.ts`, `offline-mode.test.ts`, `task-loader-edge-cases.test.ts`, `task-loader-comprehensive.test.ts`, `backlog-coverage.test.ts`, `board-loading.test.ts`, `acceptance-criteria.test.ts`, `acceptance-criteria-manager.test.ts`, `acceptance-criteria-structured.test.ts`, `assignee.test.ts`, `priority.test.ts`, `statistics.test.ts`, `task-watcher.test.ts`, `config-commands.test.ts`, `dependency-validation.test.ts`, `filesystem.test.ts`, `id-generation.test.ts`, `start-id.test.ts`

**Patterns used**: Direct import of modules, `createUniqueTestDir`, `FileSystem` + `ContentStore` setup in `beforeEach`

**Issues**:
| File | Issue | Severity |
|---|---|---|
| `backlog-coverage.test.ts` | 816 lines — catch-all with trivial "does not throw" tests | Medium |
| `git.test.ts` | 32 lines — only 3 basic assertions, no-op test | High |
| `content-store-comprehensive.test.ts` | Accesses private `isRecursiveUnsupported` via `store["..."]` | Low |
| `offline-mode.test.ts` | Private method access via type assertion + `mkdtemp` instead of `createUniqueTestDir` | Low |

---

## 2. Cross-Cutting Themes

### 2.1 Coverage-Only Test Files (Grade: C)

Files that exist primarily to instrument modules for `bun --coverage`:

| File | Lines | Assertions? | Verdict |
|---|---|---|---|
| `cli-coverage.test.ts` | 37 | 1 trivial | Remove or make behavioral |
| `mcp-server-cov.test.ts` | ~50 | Minimal | Remove or merge into real tests |
| `mcp-tasks-cov.test.ts` | ~50 | Minimal | Remove or merge into real tests |
| `mcp-milestones-cov.test.ts` | ~50 | Minimal | Remove or merge into real tests |
| `backlog-coverage.test.ts` | 816 | Mixed | Split and clean up |
| `zz-ui-components-coverage.test.ts` | 777 | Mixed | Improve assertions |
| `zz-task-viewer-coverage.test.ts` | 439 | Good | Keep |
| `zz-board-coverage.test.ts` | 388 | Good | Keep (remove duplicates) |
| `commands-task-cov.test.ts` | ~100 | Mixed | Merge into real tests |

**Recommendation**: Coverage-only files are a pragmatic hack for Bun's coverage instrumenter. The ideal state is to eliminate them by structuring modules so their code paths are covered by real behavioral tests. Short-term: keep them, but ensure they have at least meaningful assertions.

### 2.2 Private Method Access in Tests

Tests accessing private/protected members via type casts or bracket notation:

| File | Private member | Fix |
|---|---|---|
| `server-documents-endpoint.test.ts` | `server["core"]` | Make testable via public API or constructor DI |
| `server-init.test.ts` | `server["handleInit"]` | Test through HTTP endpoint |
| `offline-mode.test.ts` | `gitOps["isNetworkError"]`, `gitOps["execGit"]` | Make method `public` or extract pure function |
| `content-store-comprehensive.test.ts` | `store["isRecursiveUnsupported"]` | Make `protected` or `public` |
| `zz-ui-components-coverage.test.ts` | `_allKeyHandlers` (global) | Use closure-based state |

### 2.3 Duplicated Test Coverage

| Function | Tested in |
|---|---|
| `shouldRebuildColumns` | `board-ui.test.ts`, `board-render.test.ts`, `zz-board-coverage.test.ts` |
| TUI popup content rendering | `tui-definition-of-done.test.ts`, `tui-documentation.test.ts`, `tui-final-summary.test.ts` |

### 2.4 Oversized Files

| File | Lines | Split recommendation |
|---|---|---|
| `cli.test.ts` | 1508+ | Split CLI vs Core tests |
| `mcp-milestones.test.ts` | 1030 | Split by operation (create/rename/remove/archive) |
| `mcp-tasks.test.ts` | 797 | Split by operation (create/edit/view/ordinal) |
| `filesystem.test.ts` | 904 | Acceptable — logical grouping |
| `backlog-coverage.test.ts` | 816 | Split per Core method |
| `zz-ui-components-coverage.test.ts` | 777 | Split per UI component |

---

## 3. Ranking by Priority

### P0 — Immediate Action

| Issue | Files | Effort |
|---|---|---|
| Merge TUI popup triplet | `tui-definition-of-done.test.ts`, `tui-documentation.test.ts`, `tui-final-summary.test.ts` | Small |
| Fix `git.test.ts` — write real tests or remove | `git.test.ts` | Small |
| Eliminate private method access in tests | `server-documents-endpoint.test.ts`, `server-init.test.ts`, `offline-mode.test.ts`, `content-store-comprehensive.test.ts` | Medium |
| Consolidate `shouldRebuildColumns` tests | `board-ui.test.ts`, `board-render.test.ts`, `zz-board-coverage.test.ts` | Small |
| Remove coverage-only assertions from `cli-coverage.test.ts` or make behavioral | `cli-coverage.test.ts` | Small |

### P1 — High Impact

| Issue | Files | Effort |
|---|---|---|
| Split `cli.test.ts` — extract Core API tests | `cli.test.ts` | Medium |
| Split `backlog-coverage.test.ts` per method | `backlog-coverage.test.ts` | Medium |
| Reduce `setTimeout` usage in async tests | `zz-ui-components-coverage.test.ts`, `zz-board-coverage.test.ts`, `zz-task-viewer-coverage.test.ts`, `board-loading.test.ts` | Medium |
| Add `afterEach` cleanup to all describe blocks | `cli-smoke.test.ts`, others | Small |
| Replace `mkdtemp` with `createUniqueTestDir` in stragglers | `board.test.ts`, `offline-mode.test.ts` | Small |

### P2 — Medium Term

| Issue | Files | Effort |
|---|---|---|
| Split `mcp-milestones.test.ts` and `mcp-tasks.test.ts` | Large MCP test files | Medium |
| Add Playwright E2E for critical WebUI flows | **Done — see doc-17** | **Completed** |
| Expand `modality-parity.test.ts` to cover more operations | `modality-parity.test.ts` | Medium |
| Replace `toBeTruthy()` checks with specific assertions | `cli-smoke.test.ts` | Small |
| Document `RUN_INTERACTIVE_TUI_TESTS` and `canRunShell` patterns | `zz-*.test.ts` | Small |
| Extract shared `setupDom`/`teardownDom` for WebUI tests | All `*.test.tsx` files | Small |

### P3 — Low Priority / Nice to Have

| Issue | Files | Effort |
|---|---|---|
| Parameterize TUI popup tests | `tui-*` popup files | Small |
| Merge coverage files into real tests | Various `*-cov.test.ts`, `zz-*.test.ts` | Large |
| Reduce `reorder-utils.test.ts` full project init for pure-function tests | `reorder-utils.test.ts` | Small |
| Move inline helpers to `test-utils.ts` | `server-search-endpoint.test.ts`, `definition-of-done.test.ts`, `cli-board-integration.test.ts` | Small |

---

## 4. Refactoring Plan

### Phase 1: Quick Wins (1-2 hours)

1. Merge `tui-definition-of-done.test.ts`, `tui-documentation.test.ts`, `tui-final-summary.test.ts` into `tui-task-popup.test.ts`
   - Extract TTY patching helper
   - Use parameterized tests for different popup fields
   - Delete the 3 original files

2. Fix `git.test.ts`:
   - Either add real git integration tests (clone, branch, commit, log) or
   - Delete the file entirely

3. Consolidate `shouldRebuildColumns` tests:
   - Remove from `board-render.test.ts` and `zz-board-coverage.test.ts`
   - Keep in `board-ui.test.ts` (rename to `board-rebuild.test.ts`)

4. Remove coverage-only files where tests are truly no-op:
   - `cli-coverage.test.ts` — add real behavior or remove

### Phase 2: Structural Improvements (4-8 hours)

1. Split `cli.test.ts`:
   - Extract all Direct Core API tests into `backlog-coverage.test.ts` or new focused files
   - Keep only CLI-spawning/integration tests

2. Split `backlog-coverage.test.ts`:
   - One file per Core method (create, edit, list, view, etc.)

3. Eliminate private method access:
   - `isNetworkError` → extract as public pure function
   - `isRecursiveUnsupported` → make `protected` or `public`
   - `handleInit` → test via HTTP endpoint

4. Replace `mkdir`/`rm` patterns with `createUniqueTestDir`/`safeCleanup` everywhere

### Phase 3: Major Initiatives (1-2 days)

1. Split `mcp-milestones.test.ts` and `mcp-tasks.test.ts` into sub-suites

2. Add Playwright E2E setup — **DONE** (2026-06-08):
   - ✅ Install `@playwright/test` — version 1.60.0
   - ✅ Create `src/test/e2e/` directory with `critical-journeys.test.ts`
   - ✅ Create `playwright.config.ts` with webServer config
   - ✅ Create `scripts/e2e-test-server.ts` with seed data
   - ✅ 5 tests passing (board render, assignee filter, priority filter, modal, milestones)
   - ✅ 3 npm scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:debug`)
   - ✅ Headed mode tested visually
   - ✅ Port conflict resolution via `lsof` kill before Playwright start
   - See **doc-17** for full architecture and lessons learned

3. Expand `modality-parity.test.ts`:
   - Cover create/edit/delete/complete operations across all 5 modalities
   - Verify cross-modality consistency

---

## 5. Per-File Improvement Actions

See table in sections 1.1-1.6 and 3 for detailed per-file actions.

### Legend

- **REFACTOR**: Restructure within file (merge, split, rename)
- **DELETE**: Remove file (coverage-only with no value)
- **IMPROVE**: Add assertions, edge cases, or fix brittle patterns
- **CONSOLIDATE**: Merge into another file
- **MIGRATE**: Change pattern (e.g., `mkdtemp` → `createUniqueTestDir`)

| File | Action | Reason |
|---|---|---|
| `tui-definition-of-done.test.ts` | CONSOLIDATE → `tui-task-popup.test.ts` | Boilerplate duplication |
| `tui-documentation.test.ts` | CONSOLIDATE → `tui-task-popup.test.ts` | Boilerplate duplication |
| `tui-final-summary.test.ts` | CONSOLIDATE → `tui-task-popup.test.ts` | Boilerplate duplication |
| `board-render.test.ts` | CONSOLIDATE → `board-ui.test.ts` | Duplicates `shouldRebuildColumns` |
| `cli.test.ts` | REFACTOR — split CLI vs Core | 1508 lines, mixed concerns |
| `backlog-coverage.test.ts` | REFACTOR — split per Core method | 816 lines catch-all |
| `cli-coverage.test.ts` | IMPROVE — add behavioral assertions | Coverage hack |
| `git.test.ts` | IMPROVE — write real tests or DELETE | Embarrassingly minimal |
| `board.test.ts` | MIGRATE — use `createUniqueTestDir` | Uses raw `mkdtemp` |
| `offline-mode.test.ts` | MIGRATE — use `createUniqueTestDir` | Uses raw `mkdtemp` |
| `server-documents-endpoint.test.ts` | REFACTOR — avoid private member access | Type cast to access `core` |
| `server-init.test.ts` | REFACTOR — test via HTTP | Accesses private `handleInit` |
| `content-store-comprehensive.test.ts` | REFACTOR — make method testable | Bracket notation private access |
| `zz-ui-components-coverage.test.ts` | IMPROVE — remove `setTimeout`, add assertions | Slow, trivial tests |
| `zz-board-coverage.test.ts` | IMPROVE — remove duplicated tests | 3-way duplicate |
| `cli-smoke.test.ts` | IMPROVE — `toBeTruthy` → specific assertions | Weak signal |
| `mcp-milestones.test.ts` | REFACTOR — split by operation | 1030 lines |
| `mcp-tasks.test.ts` | REFACTOR — split by operation | 797 lines |

---

## 6. What We're Doing Right

Worth calling out patterns that should be preserved and promoted:

1. **MCP `testInterface` pattern** — registers tools without transport; fast, isolated, behavioral
2. **`commands-test-helper.ts`** — programmatic Commander testing with `exitOverride`
3. **`vterm.js` + `@termless/core`** — virtual terminal eliminates PTY dependency for TUI tests
4. **`createUniqueTestDir` + `safeCleanup`** — robust temp dir management with retry
5. **Platform-aware patterns** — `itIfPty`, `getPlatformTimeout`, Windows-safe cleanup
6. **Event-driven async testing** — `Promise.race` with subscribe for watcher tests
7. **Modality parity test** — cross-modality consistency checking (should expand)

---

## 7. Updates

### 2026-06-08 — Playwright E2E Setup Completed

**Phase 3, item 2** of the refactoring plan is now complete. See doc-17 for full details.

**Key findings from implementation**:

| Issue | Solution |
|---|---|
| Task ID prefix mismatch | Seed data must use `task-*` IDs (matches default `listTasks()` glob `task-*.md`) |
| Port conflict | `lsof -ti:6420 | xargs kill -9` before Playwright start (in `package.json` script) |
| Locator ambiguity | Use regex `/TASK-1.*Implement login page/i` to distinguish card h4 from modal h2 |
| Biome compliance | Playwright imports use `@playwright/test`, alphabetized imports by Biome |

**What was created**:
- `playwright.config.ts` — Chromium, 1280x720, trace/screenshot on-failure, webServer on :6420
- `scripts/e2e-test-server.ts` — creates temp project with 9 seed tasks, starts BacklogServer
- `src/test/e2e/critical-journeys.test.ts` — 5 tests (board, 2 filters, modal, milestones)
- 3 npm scripts in `package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:debug`

**Remaining E2E work** (future):
- Add Playwright to CI pipeline
- Expand test coverage (theme toggle, task creation from UI, milestone unassigned filter)
- Test drag-and-drop (needs workaround for browser DnD flakiness)

---

> **Rating Date**: 2026-06-03 (last updated: 2026-06-08)
> **Against**: Testing Best Practices & Philosophy (doc-15)
> **Maintainer**: Backlog.md team