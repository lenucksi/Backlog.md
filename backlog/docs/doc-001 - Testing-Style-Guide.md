---
id: doc-001
title: Testing Style Guide
type: guide
created_date: 2025-07-21
updated_date: 2026-06-08 10:15
---
# Testing Style Guide

This document establishes consistent patterns for test files in the Backlog.md project.

## Import Organization

**Standard order:**
1. `bun:test` imports first
2. `node:*` imports second  
3. External library imports (like `bun`)
4. Local relative imports (`../`)
5. Test utility imports (`./test-utils.ts`, `./test-helpers.ts`)

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";
```

## Variable Declarations

**Standard pattern:**
- Declare `let TEST_DIR: string;` outside describe blocks
- Assign unique directory in beforeEach using `createUniqueTestDir()`

```typescript
let TEST_DIR: string;

describe("Feature name", () => {
    let core: Core;
    
    beforeEach(async () => {
        TEST_DIR = createUniqueTestDir("test-feature-name");
        // ... rest of setup
    });
});
```

## Directory and Cleanup Patterns

**Standard test directory setup:**

```typescript
beforeEach(async () => {
    TEST_DIR = createUniqueTestDir("test-feature-name");
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    await mkdir(TEST_DIR, { recursive: true });
    
    // Git setup if needed
    await $`git init`.cwd(TEST_DIR).quiet();
    await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
    await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
    
    // Core initialization
    core = new Core(TEST_DIR);
    await core.initializeProject("Test Project Name");
});
```

**Standard cleanup:**

```typescript
afterEach(async () => {
    try {
        await safeCleanup(TEST_DIR);
    } catch {
        // Ignore cleanup errors - the unique directory names prevent conflicts
    }
});
```

## Git Configuration

**When git setup is needed:**
- Tests that create/modify tasks with auto-commit
- Tests that use CLI commands requiring git
- Board view tests that need git for remote branch operations

**Standard git setup:**
```typescript
await $`git init`.cwd(TEST_DIR).quiet();
await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
```

## Error Handling

**Standard error handling:**
- Use try/catch blocks for cleanup operations
- Use `.catch(() => {})` for non-critical operations like initial cleanup
- Include descriptive comments explaining error handling decisions

```typescript
// For cleanup operations
try {
    await safeCleanup(TEST_DIR);
} catch {
    // Ignore cleanup errors - the unique directory names prevent conflicts
}

// For non-critical setup operations
await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
```

## Sample Data Patterns

**Preferred patterns:**
- Declare reusable sample objects outside describe blocks when used across multiple tests
- Create inline objects when specific to single test
- Use meaningful, descriptive data that clearly indicates test purpose

```typescript
// Reusable across multiple tests
const sampleTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "To Do",
    assignee: [],
    createdDate: "2025-07-21",
    labels: ["test"],
    dependencies: [],
    body: "This is a test task",
};

describe("task operations", () => {
    it("should create task", async () => {
        await core.createTask(sampleTask, false);
        // ...
    });
    
    it("should handle specific case", async () => {
        // Inline for specific test
        const specialTask: Task = {
            ...sampleTask,
            id: "task-special",
            title: "Special Case Task",
        };
        // ...
    });
});
```

## File Organization

**Test file structure:**
1. Imports
2. Global variable declarations (TEST_DIR, constants)
3. Sample data declarations (if reused)
4. Main describe block
5. beforeEach/afterEach hooks
6. Nested describe blocks for logical grouping
7. Individual test cases

## Naming Conventions

**Test directories:** Use descriptive kebab-case names prefixed with "test-"
- `createUniqueTestDir("test-feature-name")`

**Test descriptions:** Use clear, action-oriented descriptions
- ✅ "should create task with auto-commit"
- ❌ "task creation test"

**Variables:** Use UPPER_CASE for test directory constants, camelCase for other variables

## Why These Patterns?

- **Unique directories:** Prevent test conflicts and cleanup issues
- **Consistent cleanup:** Ensure clean test environment
- **Standard git setup:** Predictable behavior across git-dependent tests  
- **Organized imports:** Easy to scan and maintain
- **Error handling:** Graceful failure without masking real issues

## Failure Patterns & Lessons Learned

Lessons from production incidents and full-suite isolation failures. Refer to task `BACK-536` for the complete case study.

### Module-Level `const` is a Trap

When a module-level `const` depends on mutable global state (process.argv, process.stdout.isTTY), it is evaluated ONCE at import time. If import order varies between test runs, the constant captures an incorrect value.

```typescript
// WRONG — evaluated at import time, value frozen
const plainFlagInArgv = process.argv.includes("--plain");

// RIGHT — evaluated at call time
function hasPlainArgv(): boolean {
    return process.argv.includes("--plain");
}
```

Applies to: process.argv, process.stdout.isTTY, process.env, process.cwd(), Date.now() — anything that can change between module load and actual use.

### Exit Code `||` vs `??`

`process.exitCode` can be 0. `exitCode || 1` treats 0 as falsy and replaces it with 1, silently turning a clean exit into a failure.

```typescript
// WRONG
exitCode = err.code || 1;  // 0 → 1 (bug!)

// RIGHT
exitCode = err.code ?? 1;  // 0 → 0, undefined → 1
```

### Mock/Override Hygiene

When overriding globals (process.exit, process.argv, console.log), the restore MUST always run—even when an error is thrown. Pattern:

```typescript
let caught: unknown;
try {
    await operation();
} catch (e) {
    caught = e;
} finally {
    // Always restore, even on error
    process.exit = originalExit;
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    console.log = originalLog;
}
if (caught) throw caught;
```

Never throw before restore. Capture the error, restore, re-throw.

### `fs.watch` (inotify) is Unreliable Under Parallel Load

When multiple test workers create `fs.watch` instances simultaneously, inotify can silently drop events. File watcher tests that pass in isolation may fail in the full suite.

Mitigation: use a **polling fallback** in addition to `fs.watch`. Periodically compare directory contents via `readdir` + per-file `stat` (mtime). The ContentStore in `src/core/content-store.ts` implements this pattern:

```typescript
// Periodically check directory for changes (catch what fs.watch missed)
private async pollChanges(): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    const sig = await computeDirSignature(entries);
    if (sig !== lastKnown) {
        await refreshFromDisk();
    }
}
```

### Explicit Flags > Auto-Detection in Tests

Tests should not rely on environment auto-detection (`shouldAutoPlain()`, `isTTY`) when the test's intent is to test a specific code path. Pass explicit flags:

```typescript
// FRAGILE — depends on test environment having no TTY
const r = await runBacklogCli(["task", "list"], TEST_DIR);

// ROBUST — explicitly requests the code path under test
const r = await runBacklogCli(["task", "list", "--plain"], TEST_DIR);
```

Keep auto-detection tests separate (e.g., `cli-auto-plain-non-tty.test.ts`) where the feature under test IS the detection logic.

### Process-Wide State: Save & Restore Per-Call

When a helper overrides `process.*` or `console.*`, save originals at function entry, not module scope. Module-level `const originalExitCode = process.exitCode` captures a value from an unpredictable point in time.

```typescript
// WRONG — module scope
const originalExitCode = process.exitCode; // frozen at import time

// RIGHT — per-call scope
export async function runBacklogCli(args, cwd) {
    const originalExitCode = process.exitCode;
    process.exitCode = 0;
    try { /* ... */ } finally {
        process.exitCode = originalExitCode;
    }
}
```

## Migration Notes

When updating existing test files:
1. Add missing imports for `createUniqueTestDir` and `safeCleanup`
2. Replace hardcoded paths with `createUniqueTestDir()` pattern
3. Update cleanup to use `safeCleanup()` with try/catch
4. Ensure consistent import order
5. Move TEST_DIR declaration outside describe blocks
6. Audit module-level consts that depend on mutable globals
7. Check exit code handling for `||` vs `??` patterns
8. Verify mock restore happens in `finally` blocks

## E2E Testing Patterns

For E2E tests using Playwright (`@playwright/test`), these conventions apply separately from `bun:test` patterns.

### File Location

All E2E tests go in `src/test/e2e/`. Separate test runner (`@playwright/test`), separate config (`playwright.config.ts`).

### Import Organization

```typescript
import { expect, test } from "@playwright/test";
```

Note: Biome alphabetizes `{ expect, test }` (not `{ test, expect }`).

### Test Server

E2E tests use a dedicated test server (`scripts/e2e-test-server.ts`) that:
1. Creates `tmp/e2e-test-project/` with git init + Core init
2. Seeds 9 tasks with `task-*` IDs (must match default prefix)
3. Starts `BacklogServer` on port 6420
4. Handles SIGTERM/SIGINT for cleanup

Port conflicts are handled by killing existing processes before Playwright starts (`lsof -ti:6420 | xargs kill -9` in `package.json` script).

### Test Patterns

**Wait for async rendering** — use `toBeVisible` with timeout, never `waitForTimeout`:
```typescript
await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });
```

**Filter testing** — verify visible AND not-visible:
```typescript
await page.getByRole("combobox", { name: "Filter board by assignee" }).selectOption("bob");
await expect(page.getByText("Set up CI pipeline")).toBeVisible();
await expect(page.getByText("Implement login page")).not.toBeVisible();
```

**Modal interaction** — locate by role, click, assert visibility lifecycle:
```typescript
const modal = page.getByRole("dialog");
await expect(modal).toBeVisible({ timeout: 3000 });
await page.getByRole("button", { name: "Close modal" }).click();
await expect(modal).not.toBeVisible();
```

### Locator Strategy (important)

Use `getByRole`, `getByText`, `getByLabel` — never CSS class names or XPath. When headings are ambiguous (card h4 vs modal h2), disambiguate with regex:
```typescript
// BAD — matches both card and modal heading
page.getByRole("heading", { name: "Implement login page" });

// GOOD — matches only modal title
page.getByRole("heading", { name: /TASK-1.*Implement login page/i });
```

### Task-Id-Prefix Gotcha

`Core.createTask()` writes files with the configured prefix (default: `task`). `listTasks()` globs for `task-*.md`. Seed data IDs must match — using `BACK-*` silently produces an empty board.

### Known Issues

- Drag-and-drop testing is skipped due to browser DnD API flakiness
- 5 Playwright workers run in parallel, sharing one server — safe for read-only tests, unsafe if tests mutate data