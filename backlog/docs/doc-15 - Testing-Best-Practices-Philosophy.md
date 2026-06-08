---
id: doc-15
title: Testing Best Practices & Philosophy
type: guide
created_date: 2026-06-03 16:59
updated_date: 2026-06-08 10:14
tags:
  - testing
  - best-practices
---
# Testing Best Practices & Philosophy

A guide for testing multi-modal TypeScript applications (CLI + TUI + WebUI + MCP + REST) in the LLM era.

---

## 1. Philosophy

### Behavioral Testing

> "The more your tests resemble the way your software is used, the more confidence they can give you."
> — React Testing Library guiding principle

Tests should verify **behavior and outcomes**, not internal implementation details. A test suite that survives a complete rewrite of a module's internals (while preserving its external contract) is a well-designed test suite.

**The rule**: If you change _how_ something works but not _what_ it does, your tests should still pass.

### Coverage is a Side-Effect, Not a Goal

Covered code is not necessarily tested code. Reaching 80% line coverage by executing paths without assertions gives false confidence. Every line covered should have at least one assertion that would fail if the behavior were broken.

### KISS Over DRY in Tests

Test **readability and independence** matter more than DRYness. Each test should be understandable on its own without chasing helper functions. Duplication in test setup is acceptable when it makes each test independently readable.

> "DRY matters much less in tests than it does in production code. Readability of an individual test file is more important than maintainability." — opensource.com

Exceptions: Shared infrastructure (temp directories, server bootstrap, platform-aware timeouts) should be extracted. Test fixtures (sample tasks, configs) can be shared when they represent domain concepts.

### AAA Pattern (Arrange-Act-Assert)

Every test should be structured in three clear sections separated by blank lines:

```ts
// ARRANGE: Set up the world
const result = await someFunction(input);

// ACT: Execute the behavior under test
const output = await result.doSomething();

// ASSERT: Verify the outcome
expect(output).toBe(expected);
```

### Test the Behavior, Not the Implementation

| Test this | NOT this |
|---|---|
| "clicking 'Save' calls the API with correct data" | "clicking 'Save' sets `isSubmitting=true` on the component state" |
| "pressing Escape closes the modal" | "pressing Escape dispatches `CLOSE_MODAL` action" |
| "list with no items shows empty message" | "list renders `EmptyState` component when `items.length === 0`" |

### Independent and Isolated Tests

Each test must be able to run alone, in any order, and in parallel. No shared mutable state between tests. Use `beforeEach` for setup, `afterEach` for teardown.

### Fast Tests Get Run

- Use temp directories (not production paths)
- Use in-process servers (not Docker containers)
- Mock external services (network, filesystem, git)
- Keep unit tests under 100ms

---

## 2. Per-Modality Testing Guide

### 2.1 CLI Testing

**Tooling**: `bun:test`, `commands-test-helper.ts` (programmatic Commander)

**Approach**: Test commands programmatically via Commander's `Command.exitOverride()` rather than spawning subprocesses. This gives deterministic behavior, fast execution, and accurate exit codes.

```ts
const { stdout, stderr, exitCode } = await runBacklogCmd(["task", "list", "--status", "To Do"], testDir);
expect(exitCode).toBe(0);
expect(stdout).toContain("BACK-1");
```

**What to test**:
- Command routing (does `backlog task create` invoke the right handler?)
- Flag parsing (--status, --priority, --assignee)
- Output format (plain, table, JSON)
- Exit codes (0 success, non-zero error)
- Error messages for invalid input
- Help output for each command
- Version output

**What NOT to test**:
- Terminal color rendering (chalk/picocolors behavior)
- Piping behavior (shell feature, not CLI feature)
- `process.exit` itself (mock it out)
- Shell completion scripts

**Existing examples**: `src/test/cli-plain-create-edit.test.ts`, `src/test/cli-search-command.test.ts`, `src/test/commands-task-cov.test.ts`

### 2.2 TUI Testing

**Tooling**: `bun:test`, `vterm.js` + `@termless/core` (virtual terminal), platform-gated with `itIfPty`

**Approach**: Create an in-memory virtual terminal (no real PTY needed), spawn the TUI process into it, then poll the screen content and press keys programmatically.

```ts
const backend = createVtermBackend({ cols: 120, rows: 40 });
const term = createTerminal({ backend, cols: 120, rows: 40 });
await term.spawn(["bun", "src/cli.ts", "board"], { cwd: testDir });
// Poll for expected content
const found = waitForText(term, "To Do", 50, 200);
term.press("q");  // Quit
```

**What to test**:
- Screen renders expected content (task lists, board columns)
- Keybindings trigger correct behavior (navigation, editing, quitting)
- Modals open/close correctly
- Alternative screen mode entry/exit
- Error states display properly
- Scrollable content

**What NOT to test**:
- Pixel-perfect rendering or cursor positioning
- Animation timing (progress bars, spinners)
- Scrollback buffer internals
- Mouse interactions (unless critical)

**Key patterns**:
- `vterm-backend.ts` wraps vterm.js to implement the `TerminalBackend` interface
- DA1/DA2/DSR queries from blessed are intercepted and responded to
- Platform-gating: `const itIfPty = process.platform !== "win32" ? it : it.skip`
- Polling loop for async output (max 50 attempts × 200ms = 10s timeout)

**Existing examples**: `src/test/tui-termless-core.test.ts`, `src/test/vterm-backend.ts`

### 2.3 WebUI Testing

#### Unit / Component Tests

**Tooling**: `bun:test`, `jsdom`, `react-dom/client`, `react`, `react-router-dom`

**Approach**: Render React components in JSDOM and interact with them via DOM APIs. No real browser needed for component-level behavior tests.

```ts
const { container } = render(<BoardPage />);
fireEvent.click(getByText("Filter"));
expect(getByText("Assignee: John")).toBeTruthy();
```

**What to test**:
- Component renders with given props
- User interactions (click, type, select) produce correct DOM changes
- Conditional rendering (loading, empty, error states)
- Form validation logic
- URL parameter sync (via `BrowserRouter`)
- Filter/sort logic

**What NOT to test**:
- CSS styles or Tailwind class presence
- Third-party component internals
- Drag-and-drop coordinates
- Scroll position
- Animation states

#### E2E Tests (missing — needs Playwright)

Currently, there are no browser-level E2E tests. For critical user journeys (full board workflow, modal interactions, error recovery), Playwright should be added.

**When to add Playwright**:
- A feature involves multiple components interacting
- A feature depends on real browser APIs (localStorage, fetch, clipboard)
- The CI pipeline catches regressions that unit tests miss

**Existing examples**: `src/test/web-board-filters.test.tsx`, `src/test/web-task-column-sort.test.tsx`

### 2.4 MCP Testing

**Tooling**: `bun:test`, MCP SDK `testInterface`

**Approach**: Create the MCP server programmatically, register tools/resources, then exercise them via the test interface without starting a transport layer.

```ts
const server = createMcpServer({ name: "test", version: "1.0" });
const tools = await server.testInterface.listTools();
expect(tools.map(t => t.name)).toContain("task_view");
```

**What to test**:
- Tool registration (correct tools appear in list)
- Tool I/O (valid arguments produce correct results)
- Tool error handling (invalid arguments produce meaningful errors)
- Resource registration and content
- Resource template matching
- Tool input schema validation
- Wiring via `createMcpServer` factory

**What NOT to test**:
- Transport layer (stdio, SSE) — SDK handles this
- Protocol handshake (initialize/initialized) — SDK handles this
- JSON-RPC serialization — SDK handles this
- Server startup/shutdown lifecycle

**Existing examples**: `src/test/mcp-server.test.ts`, `src/test/mcp-tasks.test.ts`, `src/test/mcp-milestones.test.ts`

### 2.5 REST / Server Testing

**Tooling**: `bun:test`, in-process Express/HTTP server, `fetch()`

**Approach**: Import the router/handler directly, start the server in-process, and make HTTP requests to it.

```ts
const app = await createApp(testDir);
const res = await app.fetch(new Request("http://localhost/tasks"));
expect(res.status).toBe(200);
const body = await res.json();
expect(body.tasks).toHaveLength(1);
```

**What to test**:
- Route registration (correct endpoints exist)
- Request handling (query params, body parsing)
- Response status codes (200, 201, 400, 404, 500)
- Response body shape
- Error responses (format, status code)
- CORS headers
- Middleware behavior (auth, logging, error handling)

**What NOT to test**:
- Express/Koa internals
- Node.js HTTP parser behavior
- TLS/HTTPS termination
- Proxy behavior

**Existing examples**: `src/test/server-tasks-endpoint.test.ts`, `src/test/server-search-endpoint.test.ts`, `src/test/server-documents-endpoint.test.ts`

### 2.6 E2E Testing (Playwright)

**Tooling**: `@playwright/test`, Chromium browser, `playwright.config.ts`

**Approach**: Test critical user journeys in a real browser. Playwright starts a dedicated test server (`scripts/e2e-test-server.ts`) with seeded tasks, then exercises the WebUI via `getByRole`/`getByText` locators.

```ts
test("board loads and renders task columns", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();
    await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });
});
```

**Architecture**:
- `playwright.config.ts` declares a `webServer` that runs `scripts/e2e-test-server.ts` on port 6420
- The test server creates `tmp/e2e-test-project/`, initializes git + Core, seeds 9 tasks, starts `BacklogServer`
- Port conflicts are handled by killing any existing process before Playwright starts (`lsof -ti:6420 | xargs kill`)

**What to test**:
- Board renders with correct columns and tasks
- Filters (assignee, priority) show/hide correct tasks
- Modal opens with correct task data and closes
- Milestone page search works

**What NOT to test**:
- Drag-and-drop positioning (relies on browser DnD API — flaky in CI)
- Animation timing (use `toBeVisible` with timeout instead of `waitForTimeout`)
- Layout/pixel-perfect rendering (use snapshot tests sparingly)
- Third-party component internals

**Port conflict resolution**: See doc-17 section 2.2. Critical: port kill must run before Playwright's port preflight check.

**Existing examples**: `src/test/e2e/critical-journeys.test.ts`

**Known gotcha — task ID prefix**: `listTasks()` globs for `task-*.md` (default prefix). Seed data IDs must match this prefix or the board will be empty despite files existing on disk.

---

## 3. Pattern Catalog

### 3.1 Temp Directory Pattern

```ts
const TEST_DIR = createUniqueTestDir("feature-name");
// Creates: tmp/feature-name-{timestamp}-{pid}-{short-uuid}
// Use safeCleanup(TEST_DIR) in afterEach
```

Why: Prevents parallel test conflicts (unique per invocation), avoids macOS `/tmp` vs `/private/tmp` issues, retries deletion on Windows.

### 3.2 Platform-Aware Patterns

```ts
const itIfPty = process.platform !== "win32" ? it : it.skip;
const timeout = process.platform === "win32" ? base * 2 : base;
```

Why: PTY tests don't run on Windows. Windows filesystem operations are slower and require retry logic.

### 3.3 Coverage-Only Test Pattern

```ts
// Used for modules with top-level side effects that Bun's --coverage instrumenter
// needs to execute. These import the module and verify it loads without crashing.
process.exit = ((code?: number) => { exitCodes.push(code ?? 0); }) as typeof process.exit;
process.argv = ["bun", "src/cli.ts", "--plain"];
const mod = await import("../cli.ts");
expect(mod).toBeDefined();
```

This is a pragmatic pattern for modules that register global listeners, set up Commander, or have required initialization side effects. These tests should migrate to behavioral tests as the module gains testability improvements.

### 3.4 Event-Driven Async Testing

```ts
const eventPromise = new Promise<T>((resolve) => {
  const unsub = store.subscribe((event) => {
    if (event.type === "expectedEvent") {
      unsub();
      resolve(event);
    }
  });
});
const result = await Promise.race([eventPromise, sleep(timeout)]);
```

Used for testing ContentStore file-watch events and other callback-driven async behavior.

---

## 4. What Never to Test

### Code Not Worth Testing

| Category | Example | Reason |
|---|---|---|
| Trivial getters/setters | `getName() { return this.name; }` | Tests duplicate the implementation exactly |
| Type definitions | `interface Task { id: string }` | TypeScript compiler catches this |
| Static config | `MAX_RETRIES = 3` | Test would just assert 3 === 3 |
| Library internals | `chalk.red("text")` | Upstream library is tested |
| Constructors without logic | `new Task({ id: "1" })` | Tests instantiation, not behavior |
| One-liner delegation | `async list() { return this.core.list(); }` | Tests routing, not behavior (test the core instead) |

### When a Test Is Worse Than No Test

A test that is:
- **Flaky**: passes 60% of the time → everyone ignores the suite
- **Silent**: never fails even when bugs are introduced → false confidence
- **Brittle**: breaks on every refactor → wastes more time than it saves
- **Slow**: takes 30s to run → gets skipped in practice
- **Duplicate**: tests the same path as an integration test at lower fidelity → keep the integration test

---

## 5. Test Lifecycle

### When to Add Tests

1. **Before fixing a bug**: Write a test that reproduces the bug, then fix it. This prevents regression.
2. **Before adding behavior**: Write the acceptance criteria as test assertions first (TDD-light).
3. **When coverage reveals untested paths**: Add targeted tests for complex logic branches.
4. **When an integration test catches a bug**: Consider whether a unit test would have caught it faster.

### When to Refactor Tests

- Test uses deprecated patterns (e.g., `querySelector` instead of `getByRole`)
- Test is too slow (>500ms for a unit test)
- Test has too many assertions (tests multiple behaviors at once)
- Test shares state with other tests

### When to Delete Tests

1. The feature or code being tested no longer exists.
2. The test never fails (zero signal) — it's not testing anything real.
3. The test is consistently flaky and the value does not justify the maintenance. A flaky test erodes trust in the entire suite.
4. The test duplicates coverage from a higher-level, more reliable test. Keep the higher-level one.
5. The test tests trivial code (getters, constructors, constants) — it provides no value.
6. The test only exists to achieve a coverage percentage target with no meaningful assertions.

### When to Delete Code (Because of Tests)

- Code that only exists because a test demands injectable dependencies but has no real-world use for them. Prefer testing through the real constructor.
- Mock setup that has become more complex than the system under test. If you're spending 50 lines setting up mocks for 10 lines of real code, the design needs rethinking.
- Dead code paths uncovered by test simplification (removing branches that are never hit).

---

## 6. LLM/AI Era Testing

### What Needs Human Judgment

| Task | Why Human |
|---|---|
| **Test strategy decisions** | Deciding what to test at what level (unit vs integration vs E2E) requires understanding business risk, velocity needs, and team maturity |
| **Interpreting flaky results** | Is this a real race condition, a network hiccup, or a test design problem? Requires system understanding |
| **Acceptance criteria definition** | "What does correct behavior look like?" requires product/domain knowledge |
| **Test infrastructure design** | Virtual terminal backends, test interfaces on servers, CI pipeline architecture — require deep systems thinking |
| **Retirement decisions** | "Should we delete this test or fix it?" requires understanding of its historical value |
| **Design for testability** | Restructuring code to be testable (dependency injection, interface extraction) needs architectural judgment |

### What LLMs Can Automate Well

| Task | Why LLM-Suitable |
|---|---|
| **Assertion generation** | "Given this input, the output should..." — LLMs can enumerate expected properties |
| **Boilerplate fixtures** | Creating realistic sample data, mock responses, state setups |
| **Edge case discovery** | "What are 5 edge cases for this function?" — LLMs are good at boundary enumeration |
| **Pattern migration** | "Rewrite all tests from pattern X to pattern Y" — mechanical, well-defined |
| **Coverage gap analysis** | "Which branches of this function lack test coverage?" — pattern recognition |
| **Test data generation** | "Create 10 tasks with varied statuses, priorities, and labels" — combinatorial generation |
| **Documentation generation** | "Summarize what this test suite covers" — synthesis task |

### Recommended Workflow

1. **Human**: Define the test strategy (what modality, what level, what to cover)
2. **LLM**: Generate test structure, fixtures, and initial assertions
3. **Human**: Review for correctness, add domain-specific edge cases
4. **LLM**: Run tests, fix failures, add uncovered cases
5. **Human**: Review for brittleness — "will this break on refactoring?"
6. **LLM**: Clean up, migrate patterns, eliminate duplication

---

## 7. Sources & Further Reading

### Books

- **"Software Engineering at Google"** — Chapters 12 (Unit Testing), 13 (Test Doubles). Defines the philosophy of unchanging tests, brittle test prevention, and test clarity. Available at https://abseil.io/resources/swe-book/html/ch12.html
- **"xUnit Test Patterns"** by Gerard Meszaros — The definitive catalog of test patterns and anti-patterns. Covers everything from Test Double patterns to test organization.

### Online Resources

- **JavaScript Testing Best Practices** — goldbergyoni/javascript-testing-best-practices. Comprehensive and practical. Sections on UI testing, integration testing, and testing philosophy. https://github.com/goldbergyoni/javascript-testing-best-practices
- **React Testing Library Guiding Principles** — "The more your tests resemble the way your software is used, the more confidence they can give you." https://testing-library.com/docs/react-testing-library/intro
- **Common Mistakes with React Testing Library** — Kent C. Dodds. https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Playwright Component Testing Best Practices** — Prefer mounting in each test, module mocks don't cross Node/browser boundary. https://playwright.dev/docs/test-components
- **Playwright E2E Best Practices** — Use specific selectors (`getByRole`, `getByLabel`), avoid hard-coded waits, isolate browser contexts. https://playwright.dev/docs/best-practices

### MCP-Specific

- **MCP Security Best Practices** — Official protocol docs on tool invocation logging, least-privilege scoping, and input validation. https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- **Model Context Protocol Specification** — JSON-RPC 2.0 wire format, tool/resource/prompt primitives. https://spec.modelcontextprotocol.io

### Testing Philosophy

- **"Deleting Tests Is A Best Practice"** — Riad Benguella. Tests that duplicate code logic or test trivial code should be deleted without guilt. https://riad.blog/2020/07/21/deleting-tests-is-a-best-practice
- **Google Testing Blog: "Just Say No to More End-to-End Tests"** — Keep E2E tests minimal; invest in unit and integration tests instead.
- **Bun Test Runner Documentation** — Snapshot testing, concurrent tests, coverage reports, platform support. https://bun.sh/docs/test

### Tool-Specific

- **Bun Test Runner** — https://bun.sh/docs/test
- **Ink Testing Library** — For testing Ink-based terminal UIs. https://github.com/vadimdemedes/ink
- **@termless/core** — Virtual terminal abstraction for TUI testing. https://github.com/postero/termless

---

> **Last updated**: 2026-06-08
> **Maintainer**: Backlog.md team

---

## Appendix A: E2E Lessons Learned

Key findings from adding Playwright E2E tests to the WebUI modality. For the full treatment, see doc-17.

### A.1 Task-ID Prefix must match the glob pattern in `listTasks()`

`listTasks()` searches for files matching the configured task prefix (default: `task-*.md`). If seed data IDs use a different prefix (`BACK-*`), tasks appear on disk but the board stays empty. Seed IDs must use `task-*` to be discoverable.

### A.2 Port Kill Timing

Playwright's `webServer` checks port availability **before** spawning the test server. A port kill inside `webServer.command` is too late. The kill must happen before Playwright itself starts — in the `package.json` script:

```
"test:e2e": "lsof -ti:6420 | xargs kill -9 2>/dev/null; bun run build:css && bunx playwright test"
```

A second kill layer inside the test server script protects against manual invocation.

### A.3 Locator Ambiguity in Modal

A heading name like "Implement login page" matches both the task card (`h4`) and the modal title (`h2`). Use `getByRole("heading", { name: /TASK-1.*Implement login page/i })` to disambiguate.

### A.4 Biome Compliance

Playwright test files must pass `biome check`. Key differences from bun:test files: imports use `@playwright/test`, and Biome alphabetizes `{ expect, test }` over `{ test, expect }`.