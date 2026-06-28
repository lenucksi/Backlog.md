Now I have all the data needed. Here is the comprehensive analysis:

---

# 1. SonarLint / SonarQube & Code Quality CLI Tooling

## SonarLint CLI

| Tool | Status | Details |
|------|--------|---------|
| **SonarLint Backend CLI** (official) | **ACTIVE** - Java JAR on Maven Central | `org.sonarsource.sonarlint.core:sonarlint-backend-cli` v11.0.0.85168 (latest). Requires Java runtime (bundled JRE 17 in MCP wrappers). Standalone, no SonarQube server needed. |
| **Old `sonarlint` CLI** (official) | **DEPRECATED / DEAD** - Last version 2.1.0.566, 2017 | SonarSource dropped the old CLI. The `npm sonarlint` package (1.1.0, 2017) bundles this dead CLI. Do not use. |
| **`@nielspeter/sonarlint-mcp-server`** | **ACTIVE** - v0.5.5, updated 2026-05-12 | Wraps the SonarLint Backend CLI (SLOOP, v10.32.0.82302) in an MCP server. Runs via `npx @nielspeter/sonarlint-mcp-server`, auto-downloads ~70MB backend on first run. TypeScript. |

### `npm search sonarlint` results:
- `sonarlint` - v1.1.0 (2017, dead) - wraps the old deprecated CLI
- **`@nielspeter/sonarlint-mcp-server`** - v0.5.5 (2026) - **the one to use**
- `eslint-plugin-sonarjs` - v4.1.0 (2026) - ESLint plugin with SonarJS rules (can be used alongside Biome)

## SonarQube MCP Server

**YES, there is an official SonarQube MCP Server** from SonarSource:
- Repository: `github.com/SonarSource/sonarqube-mcp-server`
- Exposes tools for: analysis, issues, quality gates, security hotspots, coverage, projects, dependency risks, context augmentation
- Deployment modes:
  - **SonarQube Cloud**: Native managed MCP channel (zero setup)
  - **SonarQube Server**: Self-hosted Docker or Server-hosted extension
  - **Self-hosted MCP server**: Docker container supporting stdio or Streamable HTTP
- Requires a running SonarQube Server or Cloud instance (does NOT do local-only analysis)

### Key tool: `analyze_code_snippet`
The MCP server's `analyze_code_snippet` tool can analyze a file or code snippet and return issues -- but it sends it to a SonarQube backend. It is NOT purely local.

## Can you run SonarQube analysis locally without a server?

- **SonarScanner CLI** (`sonar-scanner`): Requires a SonarQube server to report results to. No "dry run" mode. The scanning runs locally but needs a server endpoint.
- **SonarLint Backend CLI** (the Java JAR): **YES, this is fully local**. It runs the same analyzers as SonarLint IDE plugin but from the command line. No server required. This is what the MCP server wraps.
- **SonarQube CLI** (`sonar`): New CLI (distinct from SonarScanner). Has `sonar analyze` command for local changes, but requires SonarQube Cloud for Agentic Analysis. Secrets scanning works with both Cloud and Server.

**Bottom line**: For purely local Sonar analysis without a server, use the **SonarLint Backend CLI** (Java JAR) or its MCP wrapper.

## CodeQL CLI

| Aspect | Details |
|--------|---------|
| **Availability** | YES - standalone CLI, actively maintained. Latest: v2.25.6 (2026-06-04) |
| **Installation** | Download from GitHub: `codeql` bundle from `github.com/github/codeql-cli-binaries` |
| **Local analysis** | YES - fully local. `codeql database create` → `codeql database analyze` → SARIF output |
| **TypeScript support** | YES - CodeQL has JavaScript/TypeScript extractor and query packs |
| **npm package** | `codeql` (v1.0.0, 2023) - very basic wrapper; `codeql-ts` (v1.0.2, 2025) - utility; `codeql-development-mcp-server` (v2.25.6, 2026) - MCP server for CodeQL development |
| **GitHub integration** | Results can be uploaded to GitHub for display as code scanning alerts |
| **Performance** | Can be heavy; creates a database first (~minutes for medium projects) |

### CodeQL MCP Server
`codeql-development-mcp-server` on npm supports LLM requests for CodeQL development tools. This is for working WITH CodeQL queries, not for running analysis on your codebase.

## MegaLinter

| Aspect | Details |
|--------|---------|
| **Availability** | YES - actively maintained (v9.5.0, 2026-05-16) |
| **Installation** | `npx mega-linter-runner` or Docker. Requires Node.js + Docker. |
| **Local analysis** | YES - runs via Docker, can run on specific paths |
| **TypeScript support** | YES - includes eslint, prettier, etc. (but your project uses Biome) |
| **Key features** | 100+ linters, parallel execution, auto-fix, HTML reports, PR comments |
| **Setup** | `npx mega-linter-runner --install` generates config |

**Important**: MegaLinter runs linters inside Docker. For a Biome-only project, the relevant linters would be `eslint` (if you configure it), `markdownlint`, `yamllint`, etc. It doesn't natively run Biome.

## Super-Linter

| Aspect | Details |
|--------|---------|
| **Status** | GitHub's project. Active, but MegaLinter has largely surpassed it. |
| **Discussion** | There was a 2023 proposal to merge Super-Linter into MegaLinter; not completed. Both remain separate. |
| **Recommendation** | Prefer MegaLinter over Super-Linter (richer feature set, faster parallel execution, Python-based) |

## Other Notable Tools

### `aislop` (new, 2026)
- **What it is**: Purpose-built for detecting AI-generated code quality issues (narrative comments, swallowed exceptions, `as any` casts, oversized functions)
- **50+ rules across 8 languages** including TypeScript/JavaScript
- **Deterministic** - no LLM in runtime path
- **CLI**: `npx aislop@latest scan`
- **Great fit**: Catches exactly the kind of issues AI coding agents (Claude Code, Cursor) introduce
- **MIT licensed, free**

### `vibecop` (new, 2026)
- **22 detectors** for AI-era antipatterns: god functions, N+1 queries, debug logging in prod
- **CLI**: via npm, uses ast-grep for AST analysis
- **GitHub Action** with PR gate
- **TypeScript support**: All 22 detectors

### `eslint-plugin-sonarjs` (v4.1.0)
- SonarJS rules packaged as ESLint plugin
- Can be used alongside Biome (Biome handles formatting, eslint-plugin-sonarjs handles Sonar rules)
- Active development by SonarSource team

## Recommendations for This Project (Biome + TypeScript)

| Tool | Suitability | Effort to integrate | Recommendation |
|------|-------------|---------------------|----------------|
| **SonarLint MCP Server** (`@nielspeter/sonarlint-mcp-server`) | High - TS/TSX supported | Low - `npx` only, auto-downloads backend | **BEST** - MCP-native, local, no server |
| **CodeQL CLI** | Medium - heavy for this project | Medium - needs `codeql database create` | Good for security scanning but heavy |
| **SonarQube MCP Server** | Low - requires SonarQube Server/Cloud | Medium | Overkill for CLI-only project |
| **MegaLinter** | Medium - not Biome-aware | Low (Docker needed) | Only if you want non-TypeScript linting (YAML, Markdown) |
| **aislop** | **High** - catches AI slop | Very low - `npx aislop scan` | Excellent value, zero config |
| **eslint-plugin-sonarjs** | Medium - duplicate of Biome rules | Low | Could add SonarJS rules on top of Biome |

### Concrete installation commands:

```bash
# SonarLint MCP Server (recommended for code quality analysis)
npx @nielspeter/sonarlint-mcp-server
# Configure in Claude Desktop:
# claude mcp add --transport stdio sonarlint -- npx -y @nielspeter/sonarlint-mcp-server

# aislop (catches AI slop patterns)
npx aislop@latest scan

# CodeQL CLI (heavy but thorough)
# Download from https://github.com/github/codeql-cli-binaries
./codeql database create --language=typescript ./codeql-db
./codeql database analyze ./codeql-db --format=sarif-latest --output=results.sarif

# MegaLinter (multi-language, runs in Docker)
npx mega-linter-runner --flavor javascript
```

---

# 2. Large File Refactoring Analysis

## 2a. `src/core/backlog.ts` (3,135 lines) -- HIGHEST priority

### Current Responsibilities (mixed concerns):
1. **Core class** (lines 673-699): Constructor, factory for ContentStore/SearchService, config loading
2. **Module-level helpers** (lines 114-671): `buildLatestStateMap`, `filterTasksByStateSnapshots`, `applyStringField`, `resolveLabelsFromInput`, `resolveDependenciesFromInput`, `resolveReferencesFromInput`, `resolveDocumentationFromInput`, `resolveModifiedFilesFromInput`, `applyClearSetAppendBlock`, `appendBlock`, `resolveAcceptanceCriteriaFromInput`, `resolveDefinitionOfDoneFromInput`, `mergeTaskArray`, `getFilterValue`, `filterTasksWithCompleted`
3. **Query/filter logic** (lines 739-932): `applyTaskFilters`, `queryTasks`, `getTask`
4. **Task CRUD** (lines 934-1790): `getTask`, `loadTaskById`, `createTaskFromInput`, `createTask`, `updateTask`, `updateTaskFromInput`, `applyTaskUpdateInput`
5. **Draft management** (lines 1792-1945): `updateDraft`, `updateDraftFromInput`, `editTaskOrDraft`, `promoteDraftWithUpdates`, `demoteTaskWithUpdates`
6. **Bulk operations** (lines 1994-2439): `updateTasksBulk`, `reorderTask`, `bulkArchive`, `bulkUpdateTasks`
7. **Decision/CRUD** (lines 2613-2701): `createDecision`, `editDecision`, `resolveDecision`, `updateDecisionFromContent`, `createDecisionWithTitle`
8. **Document/CRUD** (lines 2703-2793): `createDocument`, `updateDocument`, `createDocumentWithId`, `createDocumentFromInput`, `updateDocumentFromInput`
9. **Task lifecycle** (lines 2245-2600): `archiveTask`, `archiveMilestone`, `renameMilestone`, `archiveDraft`, `promoteDraft`, `demoteTask`, acceptance criteria operations
10. **Config migration** (lines 1090-1288): Legacy YAML parsing, draft prefix migration
11. **ID generation** (lines 1290-1448): `generateNextId`, `getActiveAndCompletedTaskIds`, `getExistingIdsForType`
12. **Cross-branch loading** (lines 2943-3135): `loadAllTasksForStatistics`, `loadTasks`
13. **TUI editor integration** (lines 2825-2937): `editTaskInTui`, `openEditor`
14. **Sequence operations** (lines 2131-2175): `listActiveSequences`, `moveTaskInSequences`
15. **Backlink search** (lines 2177-2243): `findBacklinks`
16. **Statistics helper** (lines 2441-2458): `getTerminalStatusTasksByAge`

### Suggested Splits:

| Extract | Lines | Target Size | Pattern | Priority |
|---------|-------|-------------|---------|----------|
| `src/core/task-operations.ts` | ~550 | 300-400 | Class CoreTaskOps(Core) or standalone functions | P0 |
| `src/core/task-input-resolvers.ts` | ~250 | 200-300 | Pure functions (resolveLabelsFromInput, resolveDependenciesFromInput, etc.) | P0 |
| `src/core/id-generator.ts` | ~160 | 150-200 | Class or functions | P0 |
| `src/core/draft-operations.ts` | ~200 | 150-200 | Functions for promote/demote | P1 |
| `src/core/decision-operations.ts` | ~90 | 100-150 | Functions | P1 |
| `src/core/document-operations.ts` | ~100 | 100-150 | Functions | P1 |
| `src/core/bulk-operations.ts` | ~300 | 200-300 | bulkArchive, bulkUpdateTasks, reorderTask | P1 |
| `src/core/config-migration.ts` (already exists partially) | ~200 | 200 | Already extracted as config-migration.ts -- but backlog.ts still has legacyYaml parsing | P1 |

**Target size for remaining `backlog.ts`**: ~800-1000 lines (orchestrator class that delegates to extracted modules)

**Design pattern**: Move from monolithic `Core` class to a **Facade** pattern where `Core` imports and delegates to specialized modules (e.g., `TaskOperations`, `DraftOperations`, `DocumentOperations`). The module-level pure functions (`resolveLabelsFromInput`, etc.) should be extracted first as they have zero dependency on `Core`.

**Confidence: HIGH (9/10)** -- The concerns are cleanly separable with clear boundaries.

---

## 2b. `src/ui/task-viewer-with-search.ts` (1,883 lines) -- HIGH priority

### Current Responsibilities:
1. **Pure UI helpers** (lines 43-162): `getPriorityDisplay`, `createMilestoneLabelResolver`, `buildTaskViewerMilestoneFilterModel`, focus/direction helpers
2. **`viewTaskEnhanced` function** (lines 167-1564): THE monolithic function that does everything:
   - Task loading (lines 200-244)
   - Filter state management (lines 249-275)
   - Screen/box creation (lines 286-501)
   - Filter header integration (lines 304-462)
   - Task list creation with rendering (lines 468-853)
   - Detail pane rendering (lines 855-1030)
   - Help bar / footer (lines 1032-1063)
   - Keyboard shortcuts (lines 1365-1524)
   - Bulk selection & operations (lines 711-1161)
   - Editor integration (lines 1065-1109)
   - Popup task creation (lines 1744-1883)
3. **`generateDetailContent` function** (lines 1566-1742): Pure content generation
4. **`createTaskPopup` function** (lines 1744-1883): Standalone task popup

### Suggested Splits:

| Extract | Lines | Target Size | Pattern | Priority |
|---------|-------|-------------|---------|----------|
| `src/ui/task-detail-content.ts` | ~180 | 150-200 | Pure functions (generateDetailContent, getPriorityDisplay, createMilestoneLabelResolver) | P0 |
| `src/ui/task-viewer-state.ts` or `src/ui/use-task-viewer.ts` | ~150 | 150-200 | State interface + helper functions (focus/pane helpers, selection helpers) | P0 |
| `src/ui/task-list-pane.ts` | ~200 | 150-250 | TaskList component creation, rendering, bulk selection | P1 |
| `src/ui/task-detail-pane.ts` | ~180 | 150-200 | Detail pane rendering, scrolling | P1 |
| `src/ui/task-popup.ts` | ~140 | 100-150 | createTaskPopup (already somewhat standalone) | P1 |
| `src/ui/task-viewer-keybindings.ts` | ~200 | 200-250 | Keyboard shortcut setup (screen.key calls) | P1 |

**Target size for remaining file**: ~600-700 lines (main viewTaskEnhanced orchestrator)

**Design pattern**: The `viewTaskEnhanced` function is a classic "god function." Extract rendering functions as standalone factories first (they're already somewhat independent), then extract keyboard setup, then state helpers. The remaining function becomes an orchestrator. Consider extracting a **hook-like pattern** where state management is separated from rendering.

**Confidence: HIGH (8/10)** -- Clear separation between rendering, state, and keyboard handling.

---

## 2c. `src/file-system/operations.ts` (1,847 lines) -- MEDIUM priority

### Current Responsibilities:
1. **Directory management** (lines 104-268): `backlogDir`, `tasksDir`, `docsDir`, etc. getters + `setBacklogDirectory`, `invalidateConfigCache`
2. **Lock management** (lines 39-404): `withCreateLock`, lock error handling
3. **Task file operations** (lines 406-671): `saveTask`, `loadTask`, `listTasks`, `listCompletedTasks`, `listArchivedTasks`, `archiveTask`
4. **Draft file operations** (lines 693-850): `saveDraft`, `loadDraft`, `listDrafts`, `archiveDraft`, `promoteDraft`, `demoteTask`
5. **Decision file operations** (lines 852-897): `saveDecision`, `loadDecision`
6. **Document file operations** (lines 899-1099): `saveDocument`, `listDecisions`, `listDocuments`, `loadDocument`, `archiveDocument`, `deleteDocument`, `restoreDocument`
7. **Milestone file operations** (lines 1101-1511): `buildMilestoneIdentifierKeys`, `listMilestones`, `createMilestone`, `renameMilestone`, `archiveMilestone`, `setMilestoneDescription`
8. **Config file operations** (lines 1513-1835): `loadConfig`, `loadRawConfig`, `saveConfig`, `parseConfig`, `configToRaw`, `serializeConfig`
9. **Utility methods** (lines 1585-1679): `detectLanguage`, `sanitizeFilename`, `ensureDirectoryExists`
10. **Migration** (lines 292-342): `migrateCompletedTasks`

### Suggested Splits:

| Extract | Lines | Target Size | Pattern | Priority |
|---------|-------|-------------|---------|----------|
| `src/file-system/lock.ts` | ~100 | 80-120 | LockError, withCreateLock | P0 |
| `src/file-system/task-file-operations.ts` | ~270 | 250-300 | saveTask, loadTask, listTasks, listCompletedTasks, listArchivedTasks, archiveTask | P0 |
| `src/file-system/draft-file-operations.ts` | ~160 | 150-200 | saveDraft, loadDraft, listDrafts, archiveDraft, promoteDraft, demoteTask | P1 |
| `src/file-system/milestone-file-operations.ts` | ~420 | 350-400 | All milestone operations + identifier matching | P1 |
| `src/file-system/config-file-operations.ts` | ~330 | 250-350 | loadConfig, saveConfig, parseConfig, configToRaw, serializeConfig | P1 |
| `src/file-system/document-file-operations.ts` | ~200 | 150-200 | saveDocument, listDocuments, loadDocument, archiveDocument, etc. | P1 |
| `src/file-system/decision-file-operations.ts` | ~50 | 50-80 | saveDecision, loadDecision, listDecisions | P2 |
| `src/file-system/utils.ts` | ~100 | 100-150 | detectLanguage, sanitizeFilename, ensureDirectoryExists | P2 |

**Target size for remaining `operations.ts`**: ~200-300 lines (FileSystem class as directory/config orchestrator)

**Design pattern**: Extract into sub-modules with functions that take a `backlogDir` parameter (or part of a shared context object). The `FileSystem` class becomes a thin facade that combines them.

**Confidence: HIGH (8/10)** -- Each entity type (task, draft, document, milestone, config) has clearly separated file operations.

---

## 2d. `src/ui/board.ts` (1,735 lines) -- MEDIUM priority

### Current Responsibilities:
1. **Column/Task helpers** (lines 35-159): `buildColumnTasks`, `prepareBoardColumns`, `formatTaskListItem`, `buildRenderedTaskListItems`, `formatColumnLabel`
2. **`renderBoardTui` function** (lines 194-1735): THE monolithic function:
   - Screen setup (lines 242-258)
   - State initialization (lines 260-370)
   - Column rendering (lines 563-691): `createColumnViews`, `clearColumns`, `rebuildColumns`, `applyColumnData`
   - Selection/focus management (lines 572-753, 927-937)
   - Move mode (lines 362-381, 779-808, 1425-1488)
   - Filter integration (lines 328-360, 810-937)
   - Keyboard shortcuts (lines 1077-1231, 1347-1401, 1600-1731)
   - Bulk operations (lines 395-536)
   - Task editor integration (lines 1220-1255, 1326-1345)
   - Task completion/archiving (lines 1257-1324, 1618-1688)

### Suggested Splits:

| Extract | Lines | Target Size | Pattern | Priority |
|---------|-------|-------------|---------|----------|
| `src/ui/board-helpers.ts` | ~125 | 100-150 | buildColumnTasks, prepareBoardColumns, formatTaskListItem, formatColumnLabel, shouldRebuildColumns | P0 |
| `src/ui/board-column.ts` | ~130 | 100-150 | ColumnView management (createColumnViews, setColumnActiveState, focusColumn) | P0 |
| `src/ui/board-move-mode.ts` | ~130 | 100-150 | MoveOperation type, getProjectedColumns, performTaskMove, cancelMove | P0 |
| `src/ui/board-state.ts` | ~200 | 150-250 | State management, selection, rendering decision (renderView, getFilteredTasks) | P1 |
| `src/ui/board-keybindings.ts` | ~400 | 300-400 | All screen.key() handlers | P1 |
| `src/ui/board-editor.ts` | ~100 | 100-150 | openTaskEditor, setupContentAreaHandlers | P1 |
| `src/ui/board-footer.ts` | ~100 | 100-150 | Footer management, updateFooter, showTransientFooter | P1 |
| `src/ui/board-bulk.ts` | ~200 | 150-250 | Bulk operations (archive, status, priority, etc.) | P1 |
| `src/ui/board-complete-archive.ts` | ~150 | 100-150 | handleGlobalComplete, handleGlobalArchive, handleContentAreaComplete/Archive | P1 |

**Target size for remaining `board.ts`**: ~300-400 lines (renderBoardTui orchestrator)

**Design pattern**: Same as task-viewer-with-search -- extract pure rendering helpers first, then state management, then keyboard handlers. The main function becomes a thin orchestrator.

**Confidence: HIGH (8/10)** -- Clear boundaries between rendering, state, keyboard handling, and business operations.

---

## 2e. `src/commands/task.ts` (1,491 lines) -- MEDIUM priority

### Current Responsibilities:
1. **Helper functions** (lines 35-105): `hasCreateFieldFlags`, `hasEditFieldFlags`, `resolveCliMilestoneInput`
2. **`handleTaskCreateCommand`** (lines 107-203): Wizard or CLI-based task creation
3. **`handleTaskListCommand`** (lines 205-503): TUI or plain text task listing with filters
4. **`handleTaskEditCommand`** (lines 505-876): Wizard or CLI-based task editing
5. **`handleTaskReorderCommand`** (lines 878-959): CLI reorder logic
6. **`viewTaskSection`** (lines 961-1154): Display specific task section
7. **`registerTaskCommand`** (lines 1156-1491): Commander setup with all subcommands + their `.action()` handlers

### Suggested Splits:

| Extract | Lines | Target Size | Pattern | Priority |
|---------|-------|-------------|---------|----------|
| `src/commands/task-create-handler.ts` | ~170 | 150-200 | handleTaskCreateCommand | P0 |
| `src/commands/task-list-handler.ts` | ~300 | 250-350 | handleTaskListCommand | P0 |
| `src/commands/task-edit-handler.ts` | ~380 | 300-400 | handleTaskEditCommand (largest handler) | P0 |
| `src/commands/task-view-section.ts` | ~195 | 150-200 | viewTaskSection + helpers | P1 |
| `src/commands/task-reorder-handler.ts` | ~85 | 50-100 | handleTaskReorderCommand | P1 |
| `src/commands/task-command-registration.ts` | ~340 | 300-400 | registerTaskCommand with all .option() and .action() chains | P1 |

**Target size for remaining `task.ts`**: ~150-250 lines (imports from handlers + registerTaskCommand wiring)

**Design pattern**: Each command handler goes in its own file. `registerTaskCommand` is split into a file that sets up the Commander command and imports handlers. This is the standard Commander pattern.

**Confidence: HIGH (9/10)** -- Each handler is already a distinct function; splitting is mechanical.

---

## 2f. `src/web/components/TaskList.tsx` (1,289 lines) -- HIGH priority

### Current Responsibilities (from imports + structure):
- Filtering/search state management (URL search params, local state)
- Task table rendering with sortable columns
- Bulk selection of tasks
- Pagination or infinite scroll
- Integration with `CleanupModal`, `LabelFilterDropdown`, `FilterChips`
- API calls via `apiClient` for task operations
- Milestone and label filtering
- Inline editing triggers

### Suggested Splits:

| Extract | Target Size | Pattern | Priority |
|---------|-------------|---------|----------|
| Task table row rendering | 200-300 | `<TaskTableRow>` component | P0 |
| Filter state management | 150-200 | Custom hook `useTaskFilters` | P0 |
| Filter UI (chips, dropdowns) | 200-300 | Already partially extracted (FilterChips, LabelFilterDropdown) | P1 |
| Bulk selection logic | 100-150 | Custom hook `useBulkSelection` | P1 |
| Column sorting logic | 80-120 | Custom hook `useSortableColumns` | P1 |

**Target size for remaining TaskList.tsx**: ~400-600 lines

**Confidence: MEDIUM (7/10)** -- Would benefit from closer inspection; the component may mix presentational and container concerns.

---

## 2g. `src/web/components/TaskDetailsModal.tsx` (1,277 lines) -- HIGH priority

### Current Responsibilities (from imports + structure):
- Task detail view (preview / edit / create modes)
- Markdown editing via `PasteAwareMDEditor`
- Acceptance criteria management (`AcceptanceCriteriaEditor`)
- Dependency management (`DependencyInput`, `ChipInput`)
- File preview modal integration
- Theme integration via `useTheme`
- API calls for save/update/archive

### Suggested Splits:

| Extract | Target Size | Pattern | Priority |
|---------|-------------|---------|----------|
| Task metadata editing section | 150-200 | `<TaskMetadataFields>` component | P0 |
| Task content sections (desc/plan/notes/summary) | 200-300 | `<TaskContentSection>` component | P0 |
| Acceptance criteria + DoD section | 200-300 | Already partially extracted (AcceptanceCriteriaEditor) | P1 |
| Task header/categorization (labels, milestone, priority) | 150-200 | `<TaskHeaderFields>` component | P1 |
| Save/archive/edit logic | 100-150 | Custom hook `useTaskSave` | P1 |

**Target size for remaining TaskDetailsModal.tsx**: ~400-500 lines (orchestrator component)

**Confidence: MEDIUM (7/10)** -- Similar to TaskList, needs closer inspection but the section boundaries are clear from the UI layout.

---

## Summary Prioritization

| Priority | File | Lines | Suggested target per file | Effort |
|----------|------|-------|--------------------------|--------|
| **P0** | `src/core/backlog.ts` | 3,135 | 800-1000 | High |
| **P0** | `src/ui/task-viewer-with-search.ts` | 1,883 | 600-700 | High |
| **P0** | `src/web/components/TaskList.tsx` | 1,289 | 400-600 | Medium |
| **P0** | `src/web/components/TaskDetailsModal.tsx` | 1,277 | 400-500 | Medium |
| **P1** | `src/file-system/operations.ts` | 1,847 | 200-300 | High |
| **P1** | `src/ui/board.ts` | 1,735 | 300-400 | High |
| **P1** | `src/commands/task.ts` | 1,491 | 150-250 | Medium |

**P0** = Start with these -- they are the most critical (largest, most mixed concerns, central to the codebase).
**P1** = Do after P0 -- still large but either less central or have clearer boundaries.
