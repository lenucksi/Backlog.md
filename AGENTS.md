
<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_backlog_instructions()` to load the tool-oriented overview. Use the `instruction` selector when you need `task-creation`, `task-execution`, or `task-finalization`.

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->

When you're working on a task, you should assign it yourself: -a @{your-name}

In addition to the rules above, please consider the following:
At the end of every task implementation, try to take a moment to see if you can simplify it.
When you are done implementing, you know much more about a task than when you started.
At this point you can better judge retrospectively what can be the simplest architecture to solve the problem.
If you can simplify the code, do it.

## Simplicity-first implementation rules

- Prefer a single implementation for similar concerns. Reuse or refactor to a shared helper instead of duplicating.
- Keep APIs minimal. Favor load + upsert over load/save/update, and do not add unused methods.
- Avoid extra layers (services, normalizers, versioning) unless there is an immediate, proven need.
- Keep behavior consistent across similar stores (defaults, parse errors, locking). Divergence requires a clear reason.
- Don't add new exported helpers just to compute a path; derive from existing paths or add one shared helper only when reused.
- **Extract helpers from visible duplication immediately** — whether during extraction, a new feature, or a bug fix. Duplication buried in a single function becomes visible when modules split. If a pattern appears in 2+ locations, extract it right then, not in a follow-up task.


## Lessons Learned — Duplicate Code Blocks & Code Quality

### Duplicate Code Prevention

From the aislop deduplication campaign (108→1 duplicate blocks):

1. **Extract on sight**: When a pattern appears in 2+ locations, extract it immediately — not in a follow-up task. Every kept duplicate doubles future change cost.
2. **Same-file extraction first**: Before creating a new file/module, check if the helper fits in the same file. Only extract to a shared module when reused across files.
3. **Factory functions for boilerplate**: For route registration, schema definitions, and CRUD operations, prefer factory functions over copy-paste. A 10-line factory that eliminates 5×15-line blocks is always worth it.
4. **Icon/SVG deduplication**: Before inlining an `<svg>`, check `src/web/components/icons.tsx`. If the path exists, use the icon component. If it appears in 2+ files but not in icons.tsx, extract it immediately.
5. **CLI command bootstrap**: Every CLI command in `src/commands/` starts with `requireProjectRoot()` + `new Core()` + `loadConfig()` — use `ensureProjectConfig()` from `src/utils/cli-context.ts` instead of repeating the pattern.
6. **Run aislop scan before finalizing**: Run `bun x aislop scan` before marking a task Done. Address `code-quality/duplicate-block` findings — they're the cheapest debt to fix.
7. **aislop-ignore-line vs aislop-ignore-next-line**: `aislop-ignore-line` suppresses the **same line** (the comment itself), not the next line. `aislop-ignore-next-line` suppresses the line below. Multiple agents silently missed 22 knip suppressions because they used `ignore-line` before `export function` — the directive was applied to the comment line, not the export. Only `aislop-ignore-next-line` reaches the next line.
8. **aislop-ignore in `.tsx` files**: JSX comments `{/* */}` are NOT parsed by aislop's directive regex. For `.tsx` files, use `aislop-ignore-file` at the top of the file, or place `//` comments before `const X = (` assignments (outside JSX expression context).
9. **CLI command chaining — preserve bespoke style**: Commander.js `.option()` chains must NOT be extracted to data tables. The bespoke style has human readability value. Suppress `repeated-chained-call` with `aislop-ignore-next-line` placed directly before the first `.option()` call, not before `program.command()`.
10. **Edit tool partial-replacement overlap**: When using `edit` with `oldString`/`newString`, the `newString` must not reintroduce content already below the replacement. This created duplicate Commander.js flags, crashing all 214 CLI tests.

### Code Quality Rules

1. **console.log in CLI is output, not debug**: This project is a CLI tool — `console.log()` in command handlers IS the intended stdout output mechanism, not debug logging. Do NOT flag these as "leftover debug logs". Use `console.error()` for errors (stderr). If you need debug logging during development, remove it before committing.
2. **as unknown as X is sometimes necessary**: TypeScript sometimes needs `as unknown as TargetType` for JSON.parse results, Elysia builder chains, and test fixtures. Prefer proper type guards or interfaces, but don't contort code to avoid the pattern entirely.
3. **Trivial comments breed**: A comment like `// Load config` above `const config = loadConfig()` adds noise, not value. If the code is self-explanatory, don't comment it. Reserve comments for WHY (not WHAT).
4. **React exhaustive deps**: Missing `useEffect`/`useMemo`/`useCallback` deps are runtime bugs waiting to happen. Always run `bun run check src/web/ --write` which catches these via lint rules. Never suppress with `// eslint-disable-next-line`.
5. **Narrative comment blocks**: Decorative section separators (`// --- Tasks ---`) are acceptable navigation aids in long files. Multi-line explanatory preambles should be converted to concise single-line comments or removed if the code is self-explanatory.

### Session-End Checklist Additions

Before marking a task Done, in addition to the existing checklist:

- [ ] `bun run test:fails` — catch parallel race conditions (not just `bun test`)
- [ ] `bun x aislop scan` — review `code-quality/duplicate-block` findings for the changed files
- [ ] No trivial restating comments added in new/changed code
- [ ] No console.log/debug left from development (distinguish from intended CLI output)
- [ ] No Bun.Global mocks (`Bun.stdout`, `Bun.stdin`, `Bun.stderr`) in new/changed test code
- [ ] `react-hooks/exhaustive-deps` clean for any changed React components

## Cross-Modality Checklist
Before considering a feature complete, verify coverage across all 5 access modalities:

- **CLI**: `backlog <command>` or `backlog <command> <subcommand>` exists in `src/commands/`
- **TUI**: Screen/keybinding exists in `src/ui/`
- **WebUI**: Web component/page in `src/web/` + REST endpoint in `src/server/router.ts`
- **MCP**: MCP tool registered in `src/mcp/tools/` with handler + input schema
- **REST**: HTTP endpoint in `src/server/router.ts` + handler in `src/server/handlers/`

When a modality is intentionally excluded, document the N/A status with justification in the task description.

When reviewing changed files, use the `.claude/skills/modality-parity-check.md` skill to flag cross-modality gaps.

## Parallel Test Conventions — ZERO TOLERANCE

This project runs `bun test --parallel`. Tests share NO process state.
Violating these rules causes flaky failures that surface only under parallel
load. The following are HARD RULES, not guidelines.

### 1. UNIQUE `tmp/` PER TEST — NEVER share directories

```typescript
// ✅ CORRECT
let TEST_DIR: string;
beforeEach(() => { TEST_DIR = createUniqueTestDir("my-test"); });
afterEach(() => safeCleanup(TEST_DIR));

// ❌ WRONG — cross-test file collision under parallel
const TEST_DIR = "/tmp/shared";
```

### 2. `process.*` — LOCAL RESTORE IN EVERY `it()`, never in `afterAll`

`Object.defineProperty(process.stdout, "isTTY", ...)` or mocking
`process.platform` is global state. **Always restore inside the same `it()`**
using `try/finally`. NEVER in `afterAll` or `describe`-scope.

```typescript
// ✅ CORRECT — restore inside the same it()
it("handles non-TTY", async () => {
	const orig = process.stdout.isTTY;
	Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
	try { /* test body */ }
	finally { Object.defineProperty(process.stdout, "isTTY", { value: orig, configurable: true }); }
});

// ❌ WRONG — describe-scope afterAll races with parallel workers
const orig = process.stdout.isTTY;
afterAll(() => { process.stdout.isTTY = orig; });
```

### 3. MODULE-LEVEL CACHING IS FORBIDDEN — `import()` is shared

Bun caches `import()` across workers in `--parallel`. If you cache state at
module level, all workers see the same stale value.

```typescript
// ✅ CORRECT — live check inside each it()
const itIfTty = (name: string, fn: () => void) =>
	process.stdout.isTTY ? it(name, fn) : it.skip(name, fn);

// ❌ WRONG — cached at import time, stale under parallel
const itIfTty = process.stdout.isTTY ? it : it.skip;
```

Same rule applies to `initHelpers()`, helper registrations, or any
module-level variable that is mutated after creation.

### 4. NO `top-level await` IN EXPORTED MODULES

Top-level `await` blocks the module graph. Under `--parallel`, every file
importing this module crashes with `ReferenceError: Cannot access X before
initialization`.

```typescript
// ✅ CORRECT — synchronous getter
const APP_VERSION = getVersionSync();

// ❌ WRONG — blocks parallel imports of this module
const APP_VERSION = await getVersion();
```

### 5. SUBPROCESS ($\`...\`) IS FOR CLI-CONTRACT TESTS ONLY

`bun $\`bun src/cli.ts …\`` is ~500ms+ per call. It spawns a full CLI process.
Prefer Core API for business logic.

```typescript
// ✅ CORRECT — in-process, ~50ms
const core = new Core(TEST_DIR);
await core.createTask(task);

// ✅ CORRECT — CLI contract test, annotated
// CLI-CONTRACT: tests help text output format
const result = await $`bun src/cli.ts task create ...`.cwd(TEST_DIR).nothrow();

// ❌ WRONG — business logic via subprocess
const result = await $`bun src/cli.ts task create "My task"`.cwd(TEST_DIR).nothrow();
```

Self-healing test fixtures under `test/selfhealing/` are DESIGNED to fail
— they contain deliberate bugs that an LLM must diagnose and fix.
They MUST be excluded from all normal test runs via
`--path-ignore-patterns='test/selfhealing/**'`. Each self-healing test
must have its own dedicated run script (e.g. `bun run test:selfheal:guard`)
that is never part of `bun test`, `bun run test:ci`, or any CI pipeline.

### 6. MEGA-TESTS WITH 5+ SUBPROCESS CALLS — SET EXPLICIT TIMEOUT

CI runs with `--timeout=10000`. A test doing 5+ CLI subprocess calls under
parallel load regularly exceeds this.

```typescript
it("handles all scenarios", async () => {
	// 5 subprocess calls + assertions
}, 30000);  // ✅ explicit timeout
```

### 7. SERVER/PTY/WATCHER — CLEANUP IN `afterEach`, NOT IN `afterAll`

A lingering server blocks the next test's port or lock file.

```typescript
afterEach(async () => {
	if (server) { await server.stop(); server = null; }
	if (watcher) { watcher.close(); watcher = null; }
	await safeCleanup(TEST_DIR);
});
```

### 8. VERIFICATION WORKFLOW — use `test:fails` as accelerator

After every change:

```bash
bun run test:fails    # --parallel --only-failures — catches race conditions
bun run check .       # Biome format + lint
```

`test:fails` is the **only** reliable way to catch parallel race conditions
because it reproduces the exact `--parallel` worker scheduling. Serial test
runs mask these bugs. **Run `bun run test:fails` before every task finalization**
— a passing `bun test` run alone is NOT sufficient evidence of correctness.
A failing `test:fails` after your changes means your code has a parallel race
condition, even if all tests pass when run individually.

### 9. PRE-EXISTING FAILURE CHECK

If a test fails after your change and you suspect the cause is pre-existing:

```bash
git stash && bun test src/test/die-datei.test.ts && git stash pop
```

If it fails on both — pre-existing. If only on your change — your bug.

### 10. NEVER mock Bun globals — mock `process.*` instead

`Bun.stdout`, `Bun.stdin`, and `Bun.stderr` are `BunFile` objects (blobs),
NOT TTY WriteStreams. Assigning a mock function to their `.write` method
corrupts Bun's internal epoll file descriptor tracking and causes
`EEXIST: file already exists, epoll_ctl` crashes under parallel load.

`process.stdout.write` is NOT a legacy Node.js compatibility shim in Bun.
It goes through Bun's native implementation and is the correct API path
for stdout output. Bun tests that previously worked with `process.stdout`
mocks WILL break if you touch `Bun.stdout`.

```typescript
// ✅ CORRECT — mock process.stdout (Bun's correct stdout path)
const orig = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk) => { captured.push(chunk); return true; };
try { /* test body */ }
finally { process.stdout.write = orig; }

// ❌ WRONG — mocks a BunFile, destroys epoll tracking, causes EEXIST
Bun.stdout.write = mockFn as unknown as typeof Bun.stdout.write;
```

The same rule applies to `Bun.stdin` and `Bun.stderr` — always mock
`process.stdin`/`process.stderr` instead. BunFile objects must never
have their prototype methods overridden in test code.

### 11. NEVER use `Bun.spawnSync` for filesystem operations — use `fs.*Sync`

`Bun.spawnSync` spawns a child process with pipes. Each pipe file
descriptor gets registered in Bun's epoll instance. Under parallel
load, when the child process exits, the pipe fd is NOT reliably
deregistered from epoll. The next test that receives the same fd
number and calls `Bun.file(fd).writer()` crashes with
`EEXIST: file already exists, epoll_ctl`.

`fs.*Sync` APIs (`readFileSync`, `existsSync`, `statSync`, `mkdirSync`,
`writeFileSync`, `rmSync`) are NOT legacy Node.js compatibility in Bun.
They go through Bun's native Rust/Zig implementation WITHOUT spawning
child processes or allocating pipes. They are parallel-safe and the
correct choice for all filesystem operations.

```typescript
// ✅ CORRECT — fs.*Sync, zero subprocesses, parallel-safe
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
mkdirSync(dir, { recursive: true });
writeFileSync(path, content);
const data = readFileSync(path, "utf8");

// ❌ WRONG — spawns a child process with pipes, causes EEXIST under parallel
Bun.spawnSync(["mkdir", "-p", dir]);
const content = Bun.spawnSync(["cat", path]).stdout.toString();
```

Use `Bun.spawnSync` ONLY for its intended purpose: executing external
programs. Never use it as a replacement for `fs.*Sync` file operations.

### REPEAL CLAUSE

Any of these rules may only be suspended with a written `// PARALLEL-SAFE:
<reason>` annotation on the same line as the violation. The reason must be
demonstrably true (e.g., `// PARALLEL-SAFE: this module has no imports and
is loaded once per worker`). Unsafe comments get reverted.

## Task Standards

### Milestones

- **Every ticket needs a milestone.** Use existing milestones (`backlog milestone list`).
- If a new milestone is needed: ask the user with a name and description suggestion.

### Writing tickets

- **Description**: for humans — outcome, context, motivation.
- **Implementation Plan**: for LLMs — concrete files, API decisions, steps.
- **Notes**: gotchas, edge cases, references, links.
- **Acceptance Criteria**: go in frontmatter (`--ac`), not in Notes. Only check off when actually fulfilled.

### During implementation

- **Keep status current**: Move to `In Progress` as soon as implementation begins. Only set to `Done` when all ACs are checked AND DoD check is complete.
- **Check ACs correctly**: Only check when actually fulfilled. Not before (untested), not after (forgotten). DoD is checked at the end, then ACs are checked.

- **Enrich references during work**: Set `--ref`, `--doc`, `--modified-file` during work, not at the end — so sub-agents have context immediately.

- **Note implementation gotchas immediately**: Gotchas, Lessons Learned, Edge Cases — write them down as they appear, not at the end.

- **Write Final Summary on task completion**: Contains: what was done, which files, decisions, commit hash.

### Session-Start

Before implementation, in this order:

1. **Load workflow**: `backlog_get_backlog_instructions(instruction: "task-execution")`
   Fallback when MCP is unavailable: `backlog instructions task-execution` via CLI.

2. **Read task**: `backlog_task_view(id: "BACK-NNNN")`

3. **Check DoD defaults**: `backlog_definition_of_done_defaults_get()`

4. **Load conventions** (only relevant sections):
   - Always read: §Code Standards + §Parallel Test Conventions
   - If TUI: §TUI State Patterns

5. **Load skills** (always, in this order):
   - `skill(name: "context-hunter")` — MUST be loaded before any code change.
     Classifies complexity, discovers local conventions, prevents blind coding.
   - `skill(name: "backlog-technical-project-manager")` — always loaded so TPM
     coordination is available when the user requests it. Contains the Sub-Agent
     Brief Template, Plan Approval Gate, and Finalization Gate as reference.

6. **Read implementation plan**: From the task — contains LLM-specific steps.

7. **Mid-session refresh** (as needed):
   - §Simplicity-first, §Cross-Modality Checklist
   - `backlog instructions overview` via CLI when workflow guidance is needed.

### Session-Finalization

Before finalizing a task, in this order:

1. **Check Implementation Notes**: Were gotchas/learnings noted? If not, add them.

2. **Review ACs**: Check off each one. Only check if actually fulfilled — not before
   (untested), not after (forgotten). DoD is checked at the end, then ACs are checked.

3. **Check DoD defaults**: From step 3 above. Check off each one.

4. **Cross-Modality check**: `skill(name: "modality-parity-check")` when not N/A.

5. **TPM Finalization Gate**: If TPM coordination is active, run the Finalization
   Gate from the backlog-technical-project-manager skill (6 verification steps
   including PR confirmation, user-perspective validation, evidence review).

6. **Write Final Summary**: What was done, which files, decisions, commit hash.

7. **Set status to Done**: `backlog_task_edit(id, status: "Done", finalSummary: "...")`

Implementation Plan (for LLMs) and Description (for humans) are separate fields — do not mix them.

## Commands

### Development

- `bun i` - Install dependencies
- `bun test` - Run all tests
- `bun run check:types` - Type-check code
- `bun run check .` - Run all Biome checks (format + lint)
- `bun run build` - Build the CLI tool
- `bun run cli` - Uses the CLI tool directly
- `bun run aislop:scan` - Run aislop quality scan

### Testing

- `bun test <filename>` - Run specific test file

### Configuration Management

- `bun run cli config list` - View all configuration values
- `bun run cli config get <key>` - Get a specific config value (e.g. defaultEditor)
- `bun run cli config set <key> <value>` - Set a config value with validation

## Core Structure

- **CLI Tool**: Built with Bun and TypeScript as a global npm package (`npm i -g backlog.md`)
- **Source Code**: Located in `/src` directory with modular TypeScript structure
- **Task Management**: Uses markdown files in `backlog/` directory structure
- **Workflow**: Git-integrated with task IDs referenced in commits and PRs

## Agent POV

- Treat Backlog.md as a shipped CLI/MCP binary that may be used from other repositories where agents cannot inspect this source tree.
- Backlog.md is not a supported JavaScript or TypeScript library API for external consumers. Do not treat exported source symbols, classes, or methods in `/src` as stable public interfaces unless they are explicitly documented in shipped CLI/MCP/instruction surfaces.
- When you decide what another agent can rely on, use only the public surface: MCP workflow resources, MCP tool descriptions/schemas, CLI help, and instruction files shipped with the project.
- Do not assume external agents know internal implementation details, constants, or source-only conventions.
- When reviewing changes, do not ask for compatibility shims just because a source-level method exists or was removed. Only preserve compatibility for behavior that is part of the documented CLI, MCP, config, or instruction contract.
- If a convention matters for agent behavior, document it in the public MCP/instruction surface rather than relying on source-code discovery.

## Code Standards

- **Runtime**: Bun with TypeScript 5
- **Formatting**: Biome with tab indentation and double quotes
- **Linting**: Biome recommended rules
- **Testing**: Bun's built-in test runner
- **Pre-commit**: Husky + lint-staged automatically runs Biome checks before commits

The pre-commit hook automatically runs `biome check --write` on staged files to ensure code quality. If linting errors
are found, the commit will be blocked until fixed.

### Biome — NEVER `--unsafe` without explicit review

`bun run check . --write --unsafe` rewrites React dep arrays (`useExhaustiveDependencies`)
and changes `a && a.b()` to `a?.b()` (`useOptionalChain`). **Scope to your files only:**

- ✅ `bun run check src/ui/task-*.ts --write`
- ❌ `bun run check . --write --unsafe`

Accidental project-wide run? Restore with: `git diff --name-only src/test/ src/web/ | xargs git restore`

### Swagger/OpenAPI Documentation

All Swagger documentation MUST be in English. Every route MUST have
`detail.summary`, `detail.description`, and `detail.responses` (at minimum 200 + 404).

For complete schema and annotation conventions, load: `skill(name: "elysia-swagger-openapi")`

### Post-Change Verification

After **every** file creation, modification, or extraction during a session:

```bash
bun run check src/web/ src/test/ src/ui/ --write   # lint + format (scoped to your files)
bun run check:types                                 # catch broken imports/types
```

Run this mid-session (after the second dependent file in a chain), not only at session-end.
A skipped `check:types` after an extraction propagates type errors into unrelated files.

## WebUI A11y & Icon Conventions

### Icons — never inline SVGs that already exist

- Before writing `<svg>`, check `src/web/components/icons.tsx` for an existing icon.
- If a path pattern appears in **≥2 files** and is not yet in `icons.tsx`, extract it immediately.
- Always add `aria-hidden="true"` to unmatched/un-icon'd SVGs.

### Interactive elements

- Every `<button>` must have `type="button"` (unless `type="submit"` is intentional).
- Every `<label>` must have `htmlFor` matching an input's `id`.
- Every clickable `<div>` / `<span>` must have `role="button" tabIndex={0} onKeyDown` that handles Enter + Space.
- Non-interactive containers with `onKeyDown` (wizard steps, backdrop overlays) should use `role="presentation"` + a biome.json override.

### TypeScript quality

- **Array keys**: Never `key={index}`. Use `key={item.id}` or `key={stableDataProperty}`.
- **`as any`** is banned. Use `as unknown as TargetType`, `as Record<string, unknown>`, or define an interface.
- **Non-null assertions (`!`)** are banned. Use `?? fallback` or a conditional guard.
- **Variables used before declaration**: Keep `useEffect` and event listeners after the functions they reference.
- **Callback returns**: `forEach(() => expr)` needs a block body if `expr` has side effects — `forEach(() => { doSomething(); })`.

### tsconfig `paths` — Bun runtime trap

`compilerOptions.paths` in `tsconfig.json` affects **Bun's runtime** module resolution, not just
`tsc`. A type-only stub redirected via `paths` causes `SyntaxError: Export named 'X' not found`
at runtime because Bun loads the `.d.ts` file instead of the real package.

```typescript
// ❌ WRONG — in tsconfig.json, breaks Bun runtime
"paths": { "@termless/core": ["./src/types/termless-core.d.ts"] }

// ✅ CORRECT — in tsconfig.tsc.json only, tsc uses it, Bun ignores it
```

Use a separate `tsconfig.tsc.json` with `paths` and point `check:types` at it:
```json
// package.json
"check:types": "bun x tsc -p tsconfig.tsc.json --noEmit"
```

Run `bun run check <your-files> --write` on any new `.tsx` file immediately after creation — this catches all of the above before they compound.

## WebUI Conventions

Use shadcn/ui components (`Dialog`, `Button`, `Skeleton`, etc.) via `bun x shadcn@latest add <name>`.
Use semantic color tokens (`bg-background`, `text-foreground`, `text-muted-foreground`), never raw colors.
Dark mode is handled by theme tokens — no `dark:` overrides needed.

For complete conventions, load: `skill(name: "shadcn")`

## Git Workflow

- **Branching**: Use feature branches when working on tasks (e.g. `tasks/back-123-feature-name`)
- **Committing**: Use the following format: `BACK-123 - Title of the task`
- **PR titles**: Use `{taskId} - {taskTitle}` (e.g. `BACK-123 - Title of the task`)
- **Github CLI**: Use `gh` whenever possible for PRs and issues
