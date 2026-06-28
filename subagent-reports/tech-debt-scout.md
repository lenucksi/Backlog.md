Now I have all the data needed for a comprehensive report. Here it is:

---

# Tech Debt Reconnaissance Report: Backlog.md

## 1. Duplicate Frameworks/Approaches

### 1a. `@clack/prompts` + `@clack/core` classified as devDependencies (used at runtime)
**Severity: Medium** -- These are runtime interactive prompt libraries imported by 7 production command files. They should be in `dependencies`, not `devDependencies`.

| File | Dependency | Usage |
|---|---|---|
| `package.json` (line 42-43) | `@clack/core`, `@clack/prompts` in `devDependencies` | |
| `src/commands/task-wizard.ts:1-2` | Both | `TextPrompt` from `@clack/core`, `* as clack` from `@clack/prompts` |
| `src/commands/advanced-config-wizard.ts:1` | `@clack/prompts` | |
| `src/commands/migrate.ts:2` | `@clack/prompts` | |
| `src/commands/agents.ts:1` | `@clack/prompts` | |
| `src/commands/cleanup.ts:2` | `@clack/prompts` | |
| `src/commands/init.ts:1` | `@clack/prompts` | |
| `src/commands/task.ts:1` | `@clack/prompts` | |

### 1b. Duplicate color handling: `ansi.ts` (self-rolled) vs `picocolors` (library)
**Severity: Low** -- Two approaches coexist for terminal color. `picocolors` (a dependency) is used in only 2 command files, while `ansi.ts` handles color in the same and other files. Both also color in the `colorizeLabel` helper in `ansi.ts`.

| File | Approach |
|---|---|
| `src/commands/task.ts:3` | `import picocolors from "picocolors"` |
| `src/commands/task-wizard.ts:3` | `import picocolors from "picocolors"` |
| `src/commands/task.ts:9` | `import { colorizeLabel } from "../utils/ansi.ts"` |
| `src/commands/label.ts:3` | `import { colorizeLabel } from "../utils/ansi.ts"` |
| `src/commands/author.ts:3` | `import { colorizeLabel } from "../utils/ansi.ts"` |

### 1c. Custom argv parsing in `cli.ts` alongside Commander
**Severity: Low** -- `cli.ts` has two hand-rolled argument parsing functions (`getPathOverrideFromArgv`, `getMcpStartCwdOverrideFromArgv`, lines 48-92) that reimplement Commander's built-in `--option <value>` feature. This was likely done to read `--path` and `--cwd` before Commander parses (for splash screen/config migration), but duplicates the framework.

---

## 2. Self-Rolled Utilities (with library alternatives available)

### 2a. `src/utils/ansi.ts` (77 lines)
**Path:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/utils/ansi.ts`
Self-rolled ANSI color conversion (hexToRgb, hexToAnsi256, detectTerminalColorSupport, hexToTruecolorSequence, hexToAnsiSequence, colorizeLabel). `picocolors` is already in dependencies but only used in 2 files.

### 2b. `src/utils/color.ts` (17 lines)
**Path:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/utils/color.ts`
Self-rolled hex-to-contrast-color calculation (`getContrastTextColor`). Duplicates the `hexToRgb` function already in `ansi.ts`.

### 2c. `src/ui/utils/strip-tags.ts` (76 lines)
**Path:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/ui/utils/strip-tags.ts`
Self-rolled blessed tag formatting stripper (`stripBlessedFgTags`). Parses `{color-fg}...{/}` tags character-by-character with a stack.

### 2d. `src/utils/file-lock.ts` (57 lines)
**Path:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/utils/file-lock.ts`
Self-rolled directory-based file locking with heartbeat mechanism. Could potentially be replaced with `proper-lockfile` or similar.

### 2e. `src/markdown/parser.ts` + `serializer.ts` + `structured-sections.ts` (~1221 lines total)
**Paths:**
- `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/markdown/parser.ts` (255 lines)
- `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/markdown/structured-sections.ts` (711 lines)
- `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/markdown/serializer.ts` (223 lines)
- `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/markdown/section-titles.ts` (32 lines)

Self-rolled task/document/decision/milestone markdown parser and serializer. Parses frontmatter + structured sections (acceptance criteria, definition of done, implementation plan, etc.) via regex and line-by-line processing. This is the core data model and justified as custom, but it is the largest self-rolled component.

---

## 3. Dead/Unused Code

### 3a. Orphaned UI files (not imported by any production code)
| File | Lines | Status |
|---|---|---|
| `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/ui/enhanced-views.ts` | 193 | **ORPHANED** -- Zero imports from production code |
| `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/ui/simple-unified-view.ts` | 139 | **ORPHANED** -- Zero imports from production code |

Both still export but are superseded by `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/ui/unified-view.ts` (454 lines, actively used).

### 3b. Unused dependencies in `package.json`
| Dependency | Type | Status |
|---|---|---|
| `@xenova/transformers` (`^2.17.2`) | dependencies (line 118) | **NEVER IMPORTED** in any source file |
| `install` (`0.13.0`) | devDependencies (line 46) | **NEVER IMPORTED** in any source file |

### 3c. Stub type declarations with no corresponding usage
| File | Size | Concern |
|---|---|---|
| `src/types/gifenc.d.ts` | 32 lines | No `gifenc` import exists in source |
| `src/types/upng-js.d.ts` | 28 lines | No `upng-js` import exists in source |
| `src/types/raw.d.ts` | 4 lines | Unused module declaration |
| `src/types/markdown.d.ts` | 4 lines | Unused module declaration |
| `src/types/mermaid-dist.d.ts` | 4 lines | Unused module declaration (`mermaid` is used via `@uiw/react-markdown-preview`, not directly) |

### 3d. Deprecated code still exported
| Location | Line | Details |
|---|---|---|
| `src/core/backlog.ts:677` | `public fs: FileSystem` | **@deprecated** -- "Use `core.filesystem` instead. This field will be removed in a future version." Public field still accessible. |
| `src/types/index.ts:343-344` | `milestones?: string[]` | **@deprecated** -- "Milestones are sourced from milestone files, not config." Config field still accepted. |

### 3e. Duplicate `hexToRgb` function
`src/utils/ansi.ts` (line 1) and `src/utils/color.ts` (line 1) both define the identical `hexToRgb` function. Only `color.ts`'s `getContrastTextColor` is used (by 2 web components); `ansi.ts`'s `colorizeLabel` is used by 3 CLI command files.

---

## 4. Large/Complex Files (Single Responsibility Violations)

### Files over 800 lines (production code):

| File | Lines | Concerns |
|---|---|---|
| **`src/core/backlog.ts`** | **3,135** | `Core` class with 84+ methods. Handles: task CRUD, config migration, ID generation, git integration, search orchestration, sequences, statistics, task querying, legacy config migration, editor invocation. |
| **`src/ui/task-viewer-with-search.ts`** | **1,883** | Contains: milestone filter model, pane focus logic, task list rendering, detail pane, search UI, label management, keybindings. 6 standalone functions + 1 massive rendering chain. |
| **`src/file-system/operations.ts`** | **1,847** | `FileSystem` class with: task read/write/parse, document CRUD, decision CRUD, milestone CRUD, cleanup operations, file locking, path resolution, config loading. |
| **`src/ui/board.ts`** | **1,735** | Kanban board: column building, task rendering, drag-to-move, filter popup, label management, keyboard navigation, milestone filtering. |
| **`src/commands/task.ts`** | **1,491** | CLI task command: create/edit/list/view/delete/demote/reopen/subtask operations, wizard integration, plain-text output, formatted terminal output. |
| **`src/web/components/TaskList.tsx`** | **1,289** | WebUI task list with filtering, column display, label rendering, card display. |
| **`src/web/components/TaskDetailsModal.tsx`** | **1,277** | WebUI task detail edit modal: acceptance criteria editor, dependency editor, label editor, etc. |
| **`src/web/components/MilestonesPage.tsx`** | **1,119** | WebUI milestones page with progress bars, task grouping, filters. |
| **`src/commands/init.ts`** | **1,059** | CLI init: interactive prompts, config generation, agent setup, git init, multi-repo detection. |
| **`src/web/components/InitializationScreen.tsx`** | **1,017** | WebUI init flow: backend URL config, project init, onboarding steps. |
| **`src/web/components/SideNavigation.tsx`** | **1,003** | WebUI sidebar: navigation, theme toggle, status display. |
| **`src/core/content-store.ts`** | **975** | Content store: file watchers, polling, change detection, config watcher, cache management. |
| **`src/web/components/Settings.tsx`** | **882** | WebUI settings form. |
| **`src/server/router.ts`** | **792** | Single-file route definition -- defines all 50+ API routes inline. Despite being <800 lines, it is dense. |

### Concern: `Core` class (backlog.ts) vs `FileSystem` class (operations.ts)
`Core` directly references `FileSystem` and `GitOperations`, but also contains its own task manipulation logic (applying updates, filtering, normalization) that overlaps with `FileSystem`. The boundary between `Core` and `FileSystem` is unclear -- some task operations live in `Core`, some in `FileSystem`.

---

## 5. TODO/FIXME/HACK/TEMP Comments

**Count: ZERO** in production code. The codebase is remarkably clean -- no TODO/FIXME/HACK/XXX comments exist in any `.ts` or `.tsx` file under `src/` (excluding test directory variable names like `TEMP_DIR`).

---

## 6. `crud.map` / `crud.filter` Antipatterns

**Count: ZERO**. No instances of `crud.map()` or `crud.filter()` exist anywhere in the codebase. The `crud` variable/object pattern is not used.

---

## Summary of Actionable Items

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| **High** | `@clack/core` + `@clack/prompts` in devDependencies but used at runtime | Minutes | Fix packaging correctness |
| **Medium** | `enhanced-views.ts` and `simple-unified-view.ts` are orphaned (332 lines total) | Low | Dead code removal |
| **Medium** | `@xenova/transformers` in dependencies, never imported | Low | Remove unused dep |
| **Medium** | `install` in devDependencies, never imported | Low | Remove unused dep |
| **Medium** | `Core.fs` public field @deprecated since a `filesystem` accessor exists | Low | Remove deprecated field |
| **Low** | `hexToRgb` duplicated in `ansi.ts` and `color.ts` | Low | Consolidate into one helper |
| **Low** | 5 type stub files with no matching imports | Low | Remove or comment |
| **Low** | Custom argv parsing duplicates Commander | Low | Refactor to use Commander's option API |
| **Info** | 11 production files exceed 800 lines; backlog.ts at 3,135 lines is the largest | High | Extract concerns |
| **Info** | Zero TODO/FIXME/HACK/XXX comments -- very clean | -- | Maintain this standard |
| **Info** | Zero `crud.map`/`crud.filter` antipatterns | -- | No action needed |
