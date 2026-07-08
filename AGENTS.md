
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
runs mask these bugs.

### 9. PRE-EXISTING FAILURE CHECK

If a test fails after your change and you suspect the cause is pre-existing:

```bash
git stash && bun test src/test/die-datei.test.ts && git stash pop
```

If it fails on both — pre-existing. If only on your change — your bug.

### REPEAL CLAUSE

Any of these rules may only be suspended with a written `// PARALLEL-SAFE:
<reason>` annotation on the same line as the violation. The reason must be
demonstrably true (e.g., `// PARALLEL-SAFE: this module has no imports and
is loaded once per worker`). Unsafe comments get reverted.

## Task Standards

### Milestones

- **Jedes Ticket braucht einen Milestone.** Existierende Milestones verwenden (`backlog milestone list`).
- Falls ein neuer Milestone nötig ist: Nutzer fragen mit Namens- und Beschreibungsvorschlag.

### Tickets schreiben

- **Description**: für Menschen — Outcome, Kontext, Motivation.
- **Implementation Plan**: für LLMs — konkrete Dateien, API-Entscheidungen, Schritte.
- **Notes**: Gotchas, Edge Cases, Referenzen, Links.
- **Acceptance Criteria**: gehören ins Frontmatter (`--ac`), nicht in Notes. Erst abhaken wenn tatsächlich erfüllt.

### Während der Bearbeitung

- **Status aktuell halten**: Ticket auf `In Arbeit` sobald implementation beginnt. Erst auf `Fertig` wenn alle ACs gehakt UND DoD-Check durch ist.
- **References anreichern**: `--ref`, `--doc`, `--modified-file` während der Arbeit setzen, nicht erst am Ende — damit Subagenten den Kontext sofort haben.
- **Final Summary**: bei Task-Abschluss schreiben (was wurde gemacht, welche Dateien, welche Entscheidungen).

## Commands

### Development

- `bun i` - Install dependencies
- `bun test` - Run all tests
- `bunx tsc --noEmit` - Type-check code
- `bun run check .` - Run all Biome checks (format + lint)
- `bun run build` - Build the CLI tool
- `bun run cli` - Uses the CLI tool directly

### Testing

- `bun test` - Run all tests
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

`bun run check . --write --unsafe` applies **unsafe fixes** that change runtime behavior:
- `useExhaustiveDependencies` rewrites React `useEffect`/`useMemo` dep arrays
- `useOptionalChain` changes `a && a.b()` to `a?.b()` (can silently silence null errors)

**Always scope to your files** and never use `--unsafe` on the full project:
```bash
bun run check src/ui/task-*.ts --write                     # ✅ safe
bun run check src/ui/task-*.ts src/ui/task-viewer-state.ts --write  # ✅ safe
bun run check . --write --unsafe                           # ❌ DANGER — rewrites React deps
```

If you accidentally run `--unsafe` project-wide, restore affected files with:
```bash
git diff --name-only src/test/ src/web/ | xargs git restore
```

### Swagger/OpenAPI Documentation

All Swagger documentation (`summary`, `description`, `responses.*.description`, schema field `description`) MUST be written in **English only**. This is the standard language for REST API documentation and ensures consistency for external consumers.

```typescript
.get("/api/tasks/:id", handler, {
    params: t.Object({
        id: t.String({ description: "Task ID (e.g. BACK-123)" }),
    }),
    detail: {
        summary: "Get task by ID",
        description: "Returns a single task with its full metadata including subtask summaries",
        tags: ["Tasks"],
        responses: {
            200: { description: "Task object with subtaskSummaries" },
            404: { description: "Task not found" },
        },
    },
})
```

- Every route MUST have `detail.summary`, `detail.description`, and `detail.responses` (at minimum 200 + 404 where applicable)
- Path params MUST have a `params` schema with `description` on each field
- Use `t.Optional()` for nullable/optional schema fields
- Do NOT add `body` schemas unless the handler is refactored to use Elysia's parsed body instead of `await req.json()`

### WebUI Conventions

- **shadcn/ui**: Komponenten via `bun x shadcn@latest add <name>`. Keine custom Modals — `Dialog`, `AlertDialog` aus `@/components/ui/` verwenden. `Dialog`/`Sheet`/`Drawer` brauchen immer einen `DialogTitle` (auch `sr-only` wenn unsichtbar).
- **Buttons**: `Button` aus shadcn mit `variant` (`default`, `outline`, `destructive`, `ghost`, `link`). Nie rohe `<button>` mit custom Klassen.
- **Semantic colors**: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`. Keine raw-Farben wie `bg-blue-500`, `text-white`. Kein `dark:` override — Theme-Tokens decken dark mode ab.
- **cn()**: `cn()` aus `@/lib/utils` für alle bedingten Klassen. Nie Template-Literals.
- **size-*** statt `w-* h-*` bei gleicher Breite/Höhe (Icons, Avatare, Buttons).
- **gap-*** statt `space-x-*`/`space-y-*` für Abstände in Flex/Grid.
- **Loading states**: `<Skeleton>` aus shadcn, nie "Lade..."-Text.
- **Dark Mode**: `bootstrapTheme()` in `src/web/main.tsx` **vor** `createRoot` aufrufen (verhindert FOUC). Präferenz in localStorage persistieren.

## Git Workflow

- **Branching**: Use feature branches when working on tasks (e.g. `tasks/back-123-feature-name`)
- **Committing**: Use the following format: `BACK-123 - Title of the task`
- **PR titles**: Use `{taskId} - {taskTitle}` (e.g. `BACK-123 - Title of the task`)
- **Github CLI**: Use `gh` whenever possible for PRs and issues
