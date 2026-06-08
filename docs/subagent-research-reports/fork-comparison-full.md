Here is the comprehensive structured analysis.

---

# Upstream vs Fork: Complete Branch Analysis

## Executive Summary

| Metric | Upstream (`upstream-main`) | Our Fork (`main`) |
|--------|---------------------------|-------------------|
| Merge base | `7af19f80` (v1.45.1) | `7af19f80` (v1.45.1) |
| New commits | **10** (5 feature + 3 version bumps + 2 earlier) | **225** |
| Files changed | 61 | 608 |
| Lines added | +3,017 | +55,729 |
| Lines deleted | -245 | -8,885 |
| New src/ files | 3 (all tests) | 107 |
| Current version | **v1.46.0** | **v1.5.0** |

---

## A. Upstream Changes Since v1.45.1 (merge base → v1.46.0)

Only **5 real feature commits** plus version bumps landed in upstream after our divergence. They are remarkably small in scope compared to our ~225 commits.

### A1. BACK-470 — Task Comments System (PR #668) **← BIGGEST UPSTREAM FEATURE**
- **Impact**: +1,896 / -28 across 35 files
- **New concepts**: `TaskComment` / `TaskCommentInput` types, `<!-- COMMENTS:` section parser in markdown, `comments` field on `Task`
- **Key files modified**: `src/types/index.ts`, `src/core/backlog.ts`, `src/markdown/structured-sections.ts` (+357 lines), `src/server/index.ts`, `src/cli.ts`, `src/ui/task-viewer-with-search.ts`, `src/web/components/TaskDetailsModal.tsx`, `src/web/lib/api.ts`, `src/formatters/task-plain-text.ts`
- **Key files created**: `src/test/comments.test.ts` (391 lines)
- **Modalities**: CLI (`--comment`, `--comment-author` on `task edit`), MCP (`commentsAppend` + `commentAuthor` in `task_edit`), Web UI (comment list in TaskDetailsModal), TUI (display in task viewer)
- **What it adds**: Ability to append discussion/review comments to tasks, stored as `<!-- COMMENTS:` section in the markdown file, with structured author/timestamp/body entries. Comments are distinct from Implementation Notes and Final Summary.

### A2. BACK-469 — TUI Theme-Adaptive Rendering (PR #670) **← MODERATE TUI CHANGE**
- **Impact**: +816 / -46 across 16 files
- **Key changes**: Removes hardcoded colors from all TUI components (`board.ts`, `filter-header.ts`, `filter-popup.ts`, `generic-list.ts`, `loading.ts`, `overview-tui.ts`, `status-icon.ts`, `task-viewer-with-search.ts`, `tui.ts`)
- **Scroll improvements**: Better scrolling behavior in task lists
- **Key files created**: `tools/tui-screenshot-compare.sh` (467 lines, screenshot comparison tooling)
- **Key files modified**: `src/ui/tui.ts` (+59 lines, extract `createScreen`), `src/ui/board.ts` (+69 lines)

### A3. BACK-468 — GitHub Actions Updates (PR #666)
- Updates all GH actions to latest versions across `ci.yml`, `release.yml`, `shai-hulud-check.yml`
- Removes shai-hulud-check workflow entirely
- Updates `bun.lock`, `bun.nix`, `package.json` dependencies

### A4. BACK-467 + BACK-466 — win32-arm64 Support
- **BACK-466**: Adds `backlog.md-windows-arm64` as prebuilt binary target
- **BACK-467**: Builds the ARM binary on a Linux runner (cross-compilation)
- **Changes to**: `.github/workflows/release.yml`, `bun.lock`, `bun.nix`, `biome.json`, `package.json`, `scripts/postuninstall.cjs`, `src/test/resolveBinary.test.ts`

### A5. Features in v1.45.0→v1.45.1 (ALREADY IN OUR MERGE BASE)
The following features landed between v1.45.0 and v1.45.1 and are already inherited by our fork:
- BACK-465 — Fix Windows MCP document tool hangs
- BACK-464 — Shared multi-label filter dropdown on board
- BACK-463 — Align web task filters
- BACK-462 — Use terminal status for cleanup
- BACK-461 — Community tools README section
- BACK-460 — Fix TUI selected-row readability
- BACK-459 — Priority sorting in Kanban columns
- BACK-458 — Fix promoted draft default status
- BACK-457 — Stale task reads fix
- BACK-456 — Lock milestone ID allocation
- BACK-455 — CLI task milestone CRUD
- BACK-454 — Default ordinals
- BACK-453 — Windows CI stabilization
- BACK-452 — TUI keyboard shortcuts
- BACK-451 — Guard cross-branch loading
- BACK-450 — CLI document update command
- BACK-449 → BACK-395 — Various docs, fixes, caching

---

## B. Our Work Overview (v1.45.1 → main, ~225 commits)

### B1. Major Features Built (unique to us)

| Feature | Tickets | Modalities | Files |
|---------|---------|------------|-------|
| **Colored Labels** | BACK-486 | CLI, TUI, Web, MCP, REST | LabelConfig, resolveLabelColor, TUI label-manager, colored display |
| **Label CRUD + Autocomplete** | BACK-487, 488 | CLI, MCP, TUI, Web | `src/commands/label.ts`, MCP labels tools, TUI autocomplete |
| **Doc/Decision Labeling** | BACK-487 | All | Labels on documents and decisions |
| **Web UI Subtask Navigation** | BACK-493 | Web | Parent-child links, subtask badges, board grouping |
| **Backlog-Guard Hook** | BACK-494 | MCP/CLI/TUI | hooks/backlog-guard/ (TS+npm+publish) |
| **Decisions Supersedes** | BACK-515 | CLI, MCP, Web | supersedes/supersededBy fields, CLIs, MCP tools |
| **CLI Stats + Parity** | BACK-516 | CLI | backlog stats, task complete, doc archive/delete |
| **--json output** | BACK-529.2 | CLI | JSON output for all CLI commands |
| **Archive Semantics** | BACK-529 | CLI, Web | Consolidated complete/archive |
| **Port Congestion** | BACK-473 | CLI | `--non-interactive` flag, auto port |
| **Health/Blocked Analysis** | BACK-530 | CLI | Blocked/deadlocked detection |
| **Various Upstream PR ports** | BACK-519.x | All | 7 upstream PR features integrated |
| **Project Management** | BACK-507 | docs | Feature parity matrix document |

### B2. Infrastructure & Architecture Changes

| Change | Tickets | Details |
|--------|---------|---------|
| **Bun 1.3.x Migration** | BACK-530 | Replaced CJS deps (gray-matter, proper-lockfile) with inline utilities; --external bun; pinned versions |
| **CLI Command Extraction** | BACK-492.8 | Extract `src/cli.ts` → `src/commands/*.ts` (18 command modules) |
| **Server Refactoring** | BACK-492.10 | Extract `src/server/index.ts` → `src/server/handlers/*.ts` (8 handler modules) + `router.ts`, `middleware.ts`, `types.ts`, `utils.ts` |
| **MCP Modularization** | BACK-492.13 | Modular MCP tools in `src/mcp/tools/` (tasks, labels, milestones, documents, decisions, statistics, open, definition-of-done) |
| **Tech Debt Reduction** | BACK-492.x | 22+ subtasks across complexity, duplication, error handling |
| **Test Coverage** | BACK-527.x | 5 phases, 107 new test files. Coverage thresholds 50%→75% |
| **E2E Testing** | — | Playwright setup for WebUI |
| **TUI Testing** | BACK-535 | termless replacement for mocked blessed tests |
| **Lint/Tooling** | BACK-492.x | dependency-cruiser, knip, SonarQube, prek, actionlint |
| **CI/CD** | — | prek CI, actionlint workflow, publish-backlog-guard, renovate |

### B3. Key File Diff Sizes (shared files)

The shared files with the biggest divergence:

| File | Upstream diff | Our diff | Ratio |
|------|--------------|---------|-------|
| `src/cli.ts` | +47 lines | +3,966 lines | **84x ours** |
| `src/server/index.ts` | +24 lines | +1,801 lines | **75x ours** |
| `src/core/backlog.ts` | +88 lines | +1,369 lines | **16x ours** |
| `src/ui/board.ts` | +94 lines | +582 lines | **6x ours** |
| `src/web/lib/api.ts` | +43 lines | +407 lines | **9x ours** |
| `src/web/components/TaskDetailsModal.tsx` | +256 lines | +364 lines | **1.4x ours** |
| `src/types/index.ts` | +40 lines | +105 lines | **2.6x ours** |

---

## C. Cross-Reference: Overlaps and Unique Features

### C1. Overlapping Feature Domains (Parallel Implementations)

#### 🔴 Labels/Tags System — SIGNIFICANT OVERLAP

| Aspect | Upstream | Our Fork |
|--------|----------|----------|
| Label type | `labels: string[]` | `labels: Array<string \| LabelConfig>` with `color?` |
| Label CRUD | None | Full: `src/commands/label.ts`, MCP label tools |
| Autocomplete | None | TUI + CLI autocomplete |
| Multi-select filter | Shared dropdown (BACK-464, in merge base) | Enhanced with colors |
| Doc/Decision labels | None | BACK-487 adds labels to docs+decisions |

**Assessment**: We have a **strict superset** of upstream's label support. Upstream sees labels as plain strings. We added color, CRUD, autocomplete, and doc coverage. Upstream's shared multi-label filter dropdown from BACK-464 is already in our merge base.

#### 🔴 Terminal Status System — SIGNIFICANT OVERLAP

| Aspect | Upstream | Our Fork |
|--------|----------|----------|
| `isTerminalStatus` | Simple: checks last status | Extended: accepts `terminalStatuses?` param |
| `terminalStatuses` config | **NOT present** | Present: `terminalStatuses?: string[]` |
| `blockedStatuses` config | **NOT present** | Present: `blockedStatuses?: string[]` |
| Config CLI commands | None for terminal status | `backlog config get/set terminalStatuses/blockedStatuses` |

**Assessment**: Upstream's BACK-462 (already in merge base) added `isTerminalStatus()` checking the last status as the terminal status. We independently extended this with full configurable `terminalStatuses`/`blockedStatuses` arrays, including CLI config commands. Our implementation is a **strict superset** but with a different API shape — our `isTerminalStatus()` accepts an extra optional `terminalStatuses` parameter.

#### 🔴 TUI Enhancements — MODERATE OVERLAP

| Aspect | Upstream | Our Fork |
|--------|----------|----------|
| Theme-adaptive colors | **BACK-469**: removes hardcoded colors | We don't have this |
| Create screens | None | `src/ui/create-task.ts`, `create-doc.ts`, `create-draft.ts`, `create-milestone.ts` |
| Generic list component | `src/ui/components/generic-list.ts` | Not present |
| Filter popup | `src/ui/components/filter-popup.ts` | Not present |
| Label manager | None | `src/ui/components/label-manager.ts` |
| Help popup | None | `src/ui/components/help-popup.ts` |
| Sequences view | None | `src/ui/sequences.ts` |

**Assessment**: Upstream focused on removing hardcoded colors and creating reusable list/popup components. We focused on richer interactive features (create screens, label manager, sequences). These are largely **complementary** rather than conflicting.

### C2. Features Unique to Upstream (we don't have)

| Feature | Impact | Effort to Adopt |
|---------|--------|-----------------|
| **Task Comments** (BACK-470) | **HIGH** — New structured comments section in all 5 modalities | **HARD** — touches markdown parser, serializers, types, core, server, CLI, MCP, Web, TUI, tests. **35 files changed**. |
| TUI theme-adaptive colors (BACK-469) | MODERATE — Removes hardcoded colors from 10+ TUI files | **MEDIUM** — String replacements + style rework |
| TUI generic-list component | LOW — Component consolidation | **EASY** — New file, compatible addition |
| TUI filter-popup component | LOW — Component | **EASY** — New file, compatible addition |
| win32-arm64 binary | LOW — Platform support | **EASY** — Release YAML changes only |
| CLI-INSTRUCTIONS.md | LOW — Documentation | **EASY** — Readme update |
| MCP schema-generators | LOW — Utility | **EASY** — New file |
| structured-sections.ts | LOW — Parser helper | **EASY** — New file |

### C3. Features Unique to Our Fork (upstream doesn't have)

| Feature | Adoptability | Notes |
|---------|-------------|-------|
| Colored Labels (BACK-486/487/488) | **CAN_CHERRY_PICK** | Clean feature, superset of upstream labels |
| Web Subtasks (BACK-493) | **CAN_CHERRY_PICK** | Web-only feature, no infra dependency |
| Decisions Supersedes (BACK-515) | **CAN_CHERRY_PICK** | Modular, clean domain extension |
| CLI Stats (BACK-516) | **CAN_CHERRY_PICK** | Self-contained CLI additions |
| Port Congestion (BACK-473) | **CAN_CHERRY_PICK** | Small, focused fix |
| E2E Playwright (—) | **CAN_CHERRY_PICK** | Standalone test infra |
| --json output (BACK-529) | **DEPENDENT_ON_INFRA** | Depends on command restructuring |
| Feature Parity Matrix | **CAN_CHERRY_PICK** | Documentation only |
| Backlog-Guard (BACK-494) | **TOO_DIVERGENT** | **Backlog-Guard is our biggest innovation** — Typescript refactored hook system with npm package. Not present upstream at all. This is our IP. |
| Tech debt extraction (BACK-492.x) | **CAN_CHERRY_PICK individually** | Each subtask is a clean PR |
| Coverage improvements (BACK-527.x) | **TOO_DIVERGENT** | Tied to termless/our test infra |
| CLI command extraction | **TOO_DIVERGENT** | **Fundamental architecture change** — changes how CLI commands work |
| Server handler extraction | **TOO_DIVERGENT** | Same — architectural |
| MCP tool modularization | **CAN_CHERRY_PICK partially** | Modular structure could be ported but conflicts with monolith |

---

## D. Cherry-Pick Recommendations (Our Work → Upstream PRs)

### D1. High-Value, Clean PR Candidates

| Priority | Feature | PR Title | Reason |
|----------|---------|----------|--------|
| 🔴 P0 | **Colored Labels** (BACK-486) | `feat: colored labels with CRUD and autocomplete across all modalities` | Strict superset of upstream labels, clean feature boundary, huge UX improvement |
| 🔴 P0 | **Doc/Decision Labels** (BACK-487) | `feat: extend labels to documents and decisions` | Natural extension of upstream's label system, small code surface |
| 🟡 P1 | **Decisions Supersedes** (BACK-515) | `feat: add supersedes/supersededBy to decisions model` | Clean domain model extension, all 5 modalities |
| 🟡 P1 | **CLI Stats Command** (BACK-516) | `feat: add backlog stats command and task complete CLI parity` | Small, self-contained, high utility |
| 🟡 P1 | **CLI Task Complete** (BACK-516.1) | `feat: add task complete CLI command` | Gap-filler, no new concepts |
| 🟢 P2 | **Port Congestion** (BACK-473) | `fix: handle port congestion for backlog browser` | Small focused fix, universally useful |
| 🟢 P2 | **Duplicate Task ID Detection** (BACK-519.4) | `feat: duplicate task ID detection` | Quality-of-life improvement |
| 🟢 P2 | **EEXIST OneDrive Fix** (BACK-519.1) | `fix: handle EEXIST for OneDrive file create` | Platform fix |
| 🟢 P2 | **Inline Code HTML Escaping** (BACK-519.2) | `fix: escape HTML in inline code` | Bug fix |

### D2. Needs Upstream Abstraction

These features work in our codebase but depend on our refactored infrastructure. They'd need re-targeting to upstream's monolithic structure:

| Feature | Upstream Adaptation Needed |
|---------|--------------------------|
| CLI --json output | Would need re-targeting to upstream's `cli.ts` |
| CollapsibleGroup component | Web-only, could be backported independently |
| Paste-as-markdown | Web-only, could be backported independently |
| File preview feature | Web-only, could be backported independently |

### D3. NOT Suitable for Upstream (Too Divergent / Fork-Only)

| Feature | Why Not |
|---------|---------|
| Backlog-Guard (BACK-494) | This is our identifying IP. Completely different philosophy — hooks-based MCP enforcement. Not upstream's style. |
| CLI command extraction (492.8) | Upstream keeps monolithic `cli.ts`. This is architectural. |
| Server handler extraction (492.10) | Upstream keeps monolithic `server/index.ts` |
| termless TUI testing | Custom testing infrastructure specific to our setup |
| prek CI formatting | Custom CI tool choice |
| Bun-specific workarounds (1.3.x) | Upstream may stay on different bun/node version |
| Cross-Modality CI enforcement (491) | Too tied to our organization |
| Tech debt documents/audits | Internal documentation |

---

## E. Merge Recommendations (Upstream Features → Our Fork)

### E1. EASY_MERGE — Clean Pull

| Feature | Rationale |
|---------|-----------|
| **win32-arm64** (BACK-466/467) | Only touches `.github/workflows/release.yml`, `package.json`, `bun.lock`, `bun.nix`. Low conflict risk. Release YAML has diverged significantly though. |
| **MCP schema-generators** | NEW file, no conflict. Useful utility. |
| **section-titles.ts** | NEW file, no conflict. Part of comments parser. |
| **CLI-INSTRUCTIONS.md** | NEW file, no conflict. |
| **postuninstall.cjs** | NEW file, no conflict. |
| **resolveBinary.test.ts** | NEW test file, low conflict. |
| **web-api-error.test.ts** | NEW test file, low conflict. |
| **tui-screenshot-compare.sh** | NEW tool, no conflict. |

### E2. HARD_MERGE — Significant Conflict Resolution Required

| Feature | Conflict Areas |
|---------|---------------|
| **BACK-470 — Task Comments** | Touches **22 shared source files**. All of `src/core/backlog.ts`, `src/types/index.ts`, `src/server/index.ts`, `src/cli.ts`, `src/ui/task-viewer-with-search.ts`, `src/web/components/TaskDetailsModal.tsx`, `src/web/lib/api.ts` have been heavily modified on both sides. The comments feature intimately integrates into backlog.ts (63 new lines), types (15 lines), and the Web UI (138 new lines in TaskDetailsModal). |
| **BACK-469 — TUI Theme** | Touches **10+ TUI files** that we also modified: `board.ts` (+582 ours vs +69 upstream), `filter-header.ts`, `overview-tui.ts`, `status-icon.ts`, `task-viewer-with-search.ts`. Our TUI files are significantly diverged. |
| **BACK-468 — GitHub Actions** | Our `.github/workflows/` files are heavily changed (different CI, prek, publish-backlog-guard, actionlint). Would need manual reconciliation. |
| **generic-list.ts, filter-popup.ts** | Upstream creates new TUI components. We have different component architecture. Integration possible but needs design decisions. |
| **structured-sections.ts** (+357 lines) | Part of comments feature. NEW file but tied to parser changes that conflict. |

### E3. INCOMPATIBLE — Cannot Merge Without Major Rework

| Feature | Why Incompatible |
|---------|-----------------|
| **Comments `structured-sections.ts`** | This is massive (+357 lines) and extends the markdown parser extensively. Our parser was also modified (BACK-492 tech debt). The two versions are likely incompatible. |
| **Upstream `cli.ts` changes** | Our `cli.ts` is **completely restructured** into `src/commands/*`. Upstream's 15-line addition for comments (`--comment` flag) cannot be directly merged; would need porting to our command module structure. |
| **Upstream `server/index.ts` changes** | Our `server/index.ts` is **completely refactored** into handlers. Upstream's 13-line addition for comments endpoint cannot be directly merged; would need porting. |

---

## F. Key Conflict Areas and Recommended Strategy

### F1. The Three Hardest Conflicts

#### 1. `src/core/backlog.ts` — THE CRITICAL FILE
- **Upstream**: +88 lines (mostly comments feature: `appendComments`, comment validation, comment parsing)
- **Ours**: +1,369 lines (refactored complexity, added methods for labels, terminal status, statistics, organization, config-migration, content-store, plus original feature additions)
- **Strategy**: **Manual re-implementation of upstream's comments feature in our codebase**. Our `backlog.ts` changed ~30% of its content. A direct merge is impossible. The pragmatic approach is to port the **comments feature** by reading upstream's implementation and adding it to our `backlog.ts`.

#### 2. `src/cli.ts` vs `src/commands/`
- **Upstream**: Monolithic `src/cli.ts` (+15 lines for `--comment`/`--comment-author`)
- **Ours**: `src/cli.ts` heavily refactored (thin entry point) + `src/commands/*.ts` (18 command modules)
- **Strategy**: **Port upstream `--comment`/`--comment-author` to `src/commands/task.ts`**. Cannot merge directly. Low effort once comments core is in place.

#### 3. `src/server/index.ts` vs `src/server/handlers/`
- **Upstream**: Monolithic `src/server/index.ts` (+13 lines for comment API endpoint)
- **Ours**: `src/server/index.ts` is a thin shell + `src/server/handlers/tasks.ts` + 7 other handler modules
- **Strategy**: **Port comment endpoint to `src/server/handlers/tasks.ts`**. Cannot merge directly. Need to understand how upstream handles the comments API.

### F2. Recommended Overall Strategy

```
Phase 1: INGEST UPSTREAM COMMENTS (est. 1-2 weeks)
├── Read upstream BACK-470 implementation carefully
├── Add TaskComment/TaskCommentInput types to our types/index.ts
├── Add comment parsing to our markdown parser/serializer
├── Wire into our backlog.ts (appendComments logic)
├── Wire into our server handlers (comments API)
├── Wire into our CLI commands (--comment flag in task.ts)
├── Wire into our MCP tools (commentsAppend + commentAuthor)
├── Wire into our Web UI (comment display in TaskDetailsModal)
├── Wire into our TUI (comment display in task-viewer-with-search)
└── Wire into task-plain-text formatter

Phase 2: ADOPT TUI THEME (est. 3-5 days)
├── Re-apply BACK-469 color removals to our TUI files
├── Note: our TUI files diverged more, so manual
└── Add generic-list and filter-popup if desired

Phase 3: ADOPT LOW-HANGING FRUIT (est. 1-2 days)
├── win32-arm64 (release YAML + package.json)
├── MCP schema-generators utility
├── CLI-INSTRUCTIONS.md documentation
├── postuninstall.cjs script
└── tests: resolveBinary, web-api-error

Phase 4: CHERRY-PICK OUR WORK UPSTREAM (ongoing)
├── Prepare colored labels as clean PR
├── Prepare decisions supersedes as clean PR
├── Prepare CLI stats as clean PR
├── Prepare port congestion fix as clean PR
├── Prepare duplicate ID detection as clean PR
├── Prepare inline code HTML fix as clean PR
└── Prepare EEXIST OneDrive fix as clean PR

Phase 5: LONG-TERM STRATEGY
├── Decide: keep our architecture (commands/ handlers/) or align with upstream?
│   └── Our architecture is OBJECTIVELY BETTER — modular, testable, maintainable
│   └── Recommendation: KEEP our architecture, port upstream features into it
├── Consider: version numbering reset to upstream parity
│   └── We're at 1.5.0, upstream at 1.46.0 — align to 1.47.0-dev after integration
├── Decide: Backlog-Guard as competitive advantage
│   └── Keep as fork IP, do NOT upstream
└── Upstream PR strategy: Submit our best features to build goodwill and reduce divergence

```

### F3. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Comments merge fails | HIGH | Plan Phase 1 as re-implementation, not merge |
| TUI theme conflicts | MEDIUM | Accept manual re-application, treat TUI files as "ours" |
| Version confusion | LOW | After integration, bump to 1.47.0 |
| CI/workflow conflicts | LOW | Prioritize our CI (it works, is battle-tested) |
| Backlog-Guard secrecy | LOW | It's in hooks/ and packages/ — upstream will not touch it |

### F4. Key Files That Need Manual Porting (not auto-merge)

These 22 shared files all need careful manual integration because both sides touched them significantly:

```
src/cli.ts                       ⚠️ COMPLETELY RESTRUCTURED
src/core/backlog.ts              ⚠️ HEAVILY DIVERGED
src/core/search-service.ts       ⚠️ MODIFIED BOTH SIDES
src/formatters/task-plain-text.ts ⚠️ MODIFIED BOTH SIDES
src/guidelines/agent-guidelines.md ⚠️ MODIFIED BOTH SIDES
src/markdown/parser.ts           ⚠️ MODIFIED BOTH SIDES
src/markdown/serializer.ts       ⚠️ MODIFIED BOTH SIDES
src/server/index.ts              ⚠️ COMPLETELY RESTRUCTURED
src/types/index.ts               ⚠️ MODIFIED BOTH SIDES
src/ui/board.ts                  ⚠️ HEAVILY DIVERGED (582 vs 69 lines)
src/ui/components/filter-header.ts ⚠️ MODIFIED BOTH SIDES
src/ui/overview-tui.ts           ⚠️ MODIFIED BOTH SIDES
src/ui/status-icon.ts            ⚠️ MODIFIED BOTH SIDES
src/ui/task-viewer-with-search.ts ⚠️ MODIFIED BOTH SIDES
src/utils/task-edit-builder.ts   ⚠️ MODIFIED BOTH SIDES
src/web/components/TaskDetailsModal.tsx ⚠️ MODIFIED BOTH SIDES
src/web/lib/api.ts               ⚠️ HEAVILY DIVERGED (407 vs 43 lines)
src/web/styles/style.css         ⚠️ MODIFIED BOTH SIDES
package.json                     ⚠️ HEAVILY DIVERGED
biome.json                       ⚠️ MODIFIED BOTH SIDES
.github/workflows/ci.yml         ⚠️ HEAVILY DIVERGED
.github/workflows/release.yml    ⚠️ HEAVILY DIVERGED
```

### F5. Our Best PR Candidates for Upstream (Appendices)

For each, I verified the feature touches no fork-specific infrastructure:

| PR Candidate | Key Files | Upstream-Ready |
|-------------|-----------|---------------|
| Colored Labels | `src/types/index.ts` (+LabelConfig), `src/ui/components/label-manager.ts` (new), `src/commands/label.ts` (new), MCP labels/ | ✅ Added `labels: Array<string\|LabelConfig>` — backward-compatible with `labels: string[]` |
| Web Subtasks | `src/web/components/TaskCard.tsx`, `TaskDetailsModal.tsx`, `TaskList.tsx`, `Board.tsx`, `api.ts` | ✅ Web-only, no infra dependency |
| Decisions Supersedes | `src/types/index.ts`, `src/markdown/serializer.ts`, `src/commands/decision.ts`, MCP decisions/ | ✅ Clean domain model extension |
| CLI Stats | `src/commands/statistics.ts` | ✅ Self-contained |
| Port Congestion | `src/commands/browser.ts` | ✅ Small, focused |

### F6. Infrastructure Divergence Map

The key reason many features are HARD_MERGE is this architectural divergence:

```
ARCHITECTURE DIVERGENCE

CLI Layer:
  Upstream: cli.ts (one huge file)
  Us:       cli.ts (thin) → commands/*.ts (18 modules)

Server Layer:
  Upstream: server/index.ts (one huge file)
  Us:       server/index.ts (thin) → server/handlers/*.ts (8 modules)
                                         + router.ts + middleware.ts + types.ts + utils.ts

MCP Tools:
  Upstream: mcp/server.ts (mostly inline)
  Us:       mcp/tools/{tasks,labels,milestones,documents,decisions,statistics,open}/*

Core Library:
  Upstream: backlog.ts + search-service.ts (moderate size)
  Us:       backlog.ts + search-service.ts + content-store.ts + milestones.ts
            + statistics.ts + task-loader.ts + init.ts + config-migration.ts

Utilities:
  Upstream: ~10 utility files
  Us:       ~25+ utility files (async-initializer, app-error, ansi, url-helpers,
            browser-opener, cli-context, dependency-validation, deadlock-detection,
            duplicate-detection, file-lock, frontmatter, input-sanitizer, etc.)
```

The architecture divergence means **direct git merges of upstream branches would produce thousands of conflicts**. The recommended approach is **feature-by-feature porting** rather than branch-level merging.
