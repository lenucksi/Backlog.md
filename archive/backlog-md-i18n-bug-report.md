# Bug Report: Custom/Localized Status Names Break Core Functionality in Backlog.md

**Date:** 2026-05-06
**Affected Repository:** https://github.com/... (Backlog.md)
**Investigated Version:** Current main branch at `/home/jo/kit/claude-code-llm-kram/Backlog.md`
**Severity:** High — multiple core features silently broken for any non-English board configuration

---

## Executive Summary

Backlog.md supports custom status column names via `config.yml` (e.g., German: `["Offen", "In Arbeit", "Fertig", "Blockiert"]`). However, 4 separate subsystems hardcode English string comparisons (`"done"`, `"complete"`) to detect task completion, instead of using the board's configured terminal status. This causes statistics to be wrong, the `task_complete` CLI/MCP command to always fail, blocked-task detection to be incorrect, and milestone progress to be broken — for any board using non-English status names.

A correct, config-aware utility (`isTerminalStatus` in `src/utils/terminal-status.ts`) already exists in the codebase but is inconsistently adopted. The fix is to replace all hardcoded checks with this utility.

There is, however, a **second independent bug** in the utility itself: it identifies the terminal/done status as the **last element** of the `statuses` array. This convention silently breaks when a non-completion status (e.g., `"Blockiert"`) is placed after the completion status in the config — which is a natural arrangement for boards where "Blockiert" is an exceptional state rather than a workflow endpoint. See [Bug #5](#bug-5--last-element-convention-breaks-for-non-linear-status-lists) for details.

---

## Environment / Reproduction Config

`backlog/config.yml` (user's board):
```yaml
statuses:
  - "Offen"
  - "In Arbeit"
  - "Fertig"
  - "Blockiert"
```

`src/constants/index.ts:46`:
```typescript
export const DEFAULT_STATUSES = ["To Do", "In Progress", "Done"] as const;
```

---

## Existing Correct Solution (Not Used Consistently)

`src/utils/terminal-status.ts` already provides a config-aware implementation:

```typescript
export function getTerminalStatus(statuses: readonly string[]): string | null {
    if (statuses.length === 0) return null;
    const terminalStatus = statuses[statuses.length - 1];
    return terminalStatus && terminalStatus.trim().length > 0 ? terminalStatus : null;
}

export function isTerminalStatus(status: string | null | undefined, statuses: readonly string[]): boolean {
    const terminalStatus = getTerminalStatus(statuses);
    return (
        terminalStatus !== null &&
        (status ?? "").trim().toLowerCase() === terminalStatus.trim().toLowerCase()
    );
}
```

**Convention:** The terminal/completion status is defined as the **last entry** in `config.statuses`. This is the correct, config-aware contract. Every `isDoneStatus` check in the codebase should delegate to this utility.

`isTerminalStatus` is already correctly used in:
- `src/core/backlog.ts:2133` — `getTerminalStatusTasksByAge()`
- `src/cli.ts:3725` — `task cleanup` command
- `src/web/components/Board.tsx:72` — board column rendering
- `src/web/components/TaskList.tsx:115` — task list filtering

It is **not** used in the 4 buggy subsystems described below.

---

## Bug #1 — `task_complete` CLI/MCP Always Fails for Custom Status Names

### Symptom
Running `task_complete` (MCP) or the equivalent CLI command on a task with status `"Fertig"` throws:
```
Task SKILL-X is not Done. Set status to "Done" with task_edit before completing it.
```

### Root Cause

`src/mcp/tools/tasks/handlers.ts`, lines 72–74:
```typescript
private isDoneStatus(status?: string | null): boolean {
    const normalized = (status ?? "").trim().toLowerCase();
    return normalized.includes("done") || normalized.includes("complete");
}
```

Line 444:
```typescript
if (!this.isDoneStatus(task.status)) {
    throw new BacklogToolError(
        `Task ${task.id} is not Done. Set status to "Done" with task_edit before completing it.`,
        "VALIDATION_ERROR"
    );
}
```

`"fertig".includes("done")` → `false`. The guard always blocks completion.

### Impact
- `task_complete` is 100% broken for any non-English terminal status
- Workaround does not exist via MCP — the only escape is manually moving the file to the `completed/` folder

### Fix
The `isDoneStatus` private method must be replaced by a config-aware check. The handler must load `config.statuses` and pass it to `isTerminalStatus`:

```typescript
// In completeTask():
const config = await this.core.fs.loadConfig();
const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
if (!isTerminalStatus(task.status, statuses)) {
    const terminalStatus = getTerminalStatus(statuses) ?? "Done";
    throw new BacklogToolError(
        `Task ${task.id} is not in terminal status. Set status to "${terminalStatus}" with task_edit before completing it.`,
        "VALIDATION_ERROR"
    );
}
```

Same fix applies to the `archiveTask` guard on line 421 which also calls `isDoneStatus`.

---

## Bug #2 — Statistics: "Completed Tasks" Always Shows 0

### Symptom
The Statistics page shows `0 completed tasks` and `0% completion` despite the board having many tasks in the "Fertig" column.

### Root Cause

`src/core/statistics.ts`, lines 63–64:
```typescript
// Count completed tasks
if (task.status === "Done") {
    completedTasks++;
}
```

Line 83:
```typescript
if (task.status === "Done" && task.updatedDate) {
    // add to cycle time calculation
}
```

`"Fertig" === "Done"` → `false`. `completedTasks` stays at 0 for the entire board.

### Additional Effect (same file, line 101)
```typescript
// Stale task detection: tasks not updated in 30 days and not done
if (task.status !== "Done") {
    // mark as stale
}
```
All "Fertig" tasks are incorrectly included in the stale-task list, inflating that metric.

### Why "Status Distribution" Still Works
The status distribution widget reads the raw `task.status` string and counts by value — it never compares against "Done". That's why it correctly shows `"5 Offen, 6 Fertig"` while "0 completed" appears next to it.

### Fix

`statistics.ts` needs access to `config.statuses`. The function `loadAllTasksForStatistics` (in `backlog.ts:2592`) already returns the statuses array alongside tasks. Pass it through to the computation, then replace all three hardcoded checks:

```typescript
// Before:
if (task.status === "Done") { ... }
// After:
if (isTerminalStatus(task.status, statuses)) { ... }
```

---

## Bug #3 — Project Health: Completed Dependencies Still Shown as Blocking

### Symptom
"Project Health" shows tasks as blocked even though their listed dependencies have status "Fertig".

### Root Cause

`src/core/statistics.ts`, lines 112–116:
```typescript
// Identify blocked tasks (has dependencies that are not done)
if (task.dependencies && task.dependencies.length > 0 && task.status !== "Done") {
    const hasUnresolvedDeps = task.dependencies.some((depId) => {
        const dep = taskMap.get(depId);
        return dep && dep.status !== "Done";
    });
```

Two separate `!== "Done"` checks:
1. `task.status !== "Done"` — the depending task itself is not "Done"
2. `dep.status !== "Done"` — the dependency is not "Done"

Both fail for "Fertig". A task depending on a "Fertig" task is incorrectly counted as blocked.

### Fix
Same pattern as Bug #2 — replace with `isTerminalStatus(status, statuses)`.

---

## Bug #4 — Milestone Completion Progress Broken

### Symptom
Milestone progress percentages are wrong; milestones appear incomplete when all their tasks are in the terminal status column.

### Root Cause

`src/core/milestones.ts`, lines 263–265:
```typescript
export function isDoneStatus(status?: string | null): boolean {
    const normalized = (status ?? "").trim().toLowerCase();
    return normalized.includes("done") || normalized.includes("complete");
}
```

Line 293–295:
```typescript
const doneCount = bucketTasks.filter((t) => isDoneStatus(t.status)).length;
const progress = bucketTasks.length > 0 ? Math.round((doneCount / bucketTasks.length) * 100) : 0;
const isCompleted = bucketTasks.length > 0 && doneCount === bucketTasks.length;
```

`isDoneStatus("Fertig")` → `false`. Every milestone shows 0% progress.

### Fix
`getMilestoneStatistics` / `buildMilestoneSummary` must receive `config.statuses` and delegate to `isTerminalStatus`. Since milestones functions are pure and currently don't receive config, the signature needs to be extended:

```typescript
export function isDoneStatus(
    status?: string | null,
    statuses: readonly string[] = DEFAULT_STATUSES
): boolean {
    return isTerminalStatus(status, statuses);
}
```

---

## Secondary Affected Areas (Lower Severity)

These use `.toLowerCase() !== "done"` for filtering, causing "Fertig" tasks to appear in active-task lists and sequence calculations:

| File | Line | Usage |
|---|---|---|
| `src/core/backlog.ts` | 1955 | Sequence reorder — active task filter |
| `src/core/backlog.ts` | 1971 | Sequence reorder — active task filter |
| `src/core/backlog.ts` | 1990 | Sequence reorder — active task filter |
| `src/cli.ts` | 3348 | Active task filter for sequence display |
| `src/ui/sequences.ts` | 420 | Active task filter in TUI sequences view |
| `src/ui/board.ts` | 50–52 | TUI board done-column detection |
| `src/web/lib/lanes.ts` | 206 | Web board lane done-status detection |

All should be replaced with `isTerminalStatus(task.status, statuses)` after loading config.

---

## Complete Inventory of Hardcoded "Done" Checks

| File | Line(s) | Pattern | Severity |
|---|---|---|---|
| `src/mcp/tools/tasks/handlers.ts` | 72–74, 421, 444 | `normalized.includes("done") \|\| normalized.includes("complete")` | **Critical** |
| `src/core/statistics.ts` | 63, 83, 101, 112, 116 | `=== "Done"` / `!== "Done"` | **Critical** |
| `src/core/milestones.ts` | 263–265, 293–295 | `normalized.includes("done") \|\| normalized.includes("complete")` | **High** |
| `src/ui/board.ts` | 50–52 | `normalized === "done" \|\| normalized === "completed" \|\| normalized === "complete"` | **High** |
| `src/web/lib/lanes.ts` | 206 | `.includes("done") \|\| .includes("complete")` | **High** |
| `src/core/backlog.ts` | 1955, 1971, 1990 | `.toLowerCase() !== "done"` | Medium |
| `src/cli.ts` | 3348 | `.toLowerCase() !== "done"` | Medium |
| `src/ui/sequences.ts` | 420 | `.toLowerCase() !== "done"` | Medium |

---

## Recommended Fix Strategy

### Approach: Extend `isTerminalStatus` and propagate config

The utility in `src/utils/terminal-status.ts` is already the right abstraction. No new logic needed.

**Step 1 — Update `statistics.ts`**
- `calculateProjectStatistics()` already receives tasks via `loadAllTasksForStatistics()` which returns `statuses`
- Pass `statuses` into the statistics computation
- Replace all 5 `=== "Done"` / `!== "Done"` occurrences with `isTerminalStatus(status, statuses)`

**Step 2 — Update `handlers.ts` (MCP)**
- Load config in `completeTask()` and `archiveTask()`
- Replace `this.isDoneStatus()` with `isTerminalStatus(status, statuses)` from the utility
- Update error message to use the actual configured terminal status name

**Step 3 — Update `milestones.ts`**
- Extend `isDoneStatus` signature to accept optional `statuses` parameter with `DEFAULT_STATUSES` fallback
- Delegate to `isTerminalStatus`
- Update all callers to pass `config.statuses`

**Step 4 — Update `board.ts`, `lanes.ts`, `sequences.ts`, `backlog.ts`, `cli.ts`**
- Replace local `isDoneStatus` functions and inline `.toLowerCase() !== "done"` filters with `isTerminalStatus`
- Pass `statuses` from loaded config

### Non-Goals
- No new config keys needed
- No changes to the "last status = terminal status" convention
- Backward compatibility: English "Done" continues to work because `isTerminalStatus` normalizes via lowercase comparison

---

## Test Cases to Add

```typescript
// terminal-status.test.ts — extend existing suite
describe("isTerminalStatus with custom statuses", () => {
    const germanStatuses = ["Offen", "In Arbeit", "Fertig"];

    it("recognizes custom terminal status", () => {
        expect(isTerminalStatus("Fertig", germanStatuses)).toBe(true);
    });

    it("is case-insensitive for custom statuses", () => {
        expect(isTerminalStatus("fertig", germanStatuses)).toBe(true);
        expect(isTerminalStatus("FERTIG", germanStatuses)).toBe(true);
    });

    it("does not recognize non-terminal custom status as done", () => {
        expect(isTerminalStatus("Offen", germanStatuses)).toBe(false);
        expect(isTerminalStatus("In Arbeit", germanStatuses)).toBe(false);
    });

    it("still works with default English statuses", () => {
        expect(isTerminalStatus("Done", DEFAULT_STATUSES)).toBe(true);
    });
});

// Integration test: statistics with German board
describe("calculateProjectStatistics with custom statuses", () => {
    it("counts 'Fertig' tasks as completed", () => { ... });
    it("does not show 'Fertig' dependency as blocking", () => { ... });
});

// Integration test: task_complete MCP handler
describe("completeTask handler", () => {
    it("accepts task with custom terminal status", () => { ... });
    it("rejects task with non-terminal custom status", () => { ... });
    it("error message uses configured status name, not 'Done'", () => { ... });
});
```

---

## Bug #5 — "Last Element = Done" Convention Breaks for Non-Linear Status Lists

### Symptom
On a board where `"Blockiert"` is configured **after** `"Fertig"` in `config.yml`, `isTerminalStatus("Fertig", statuses)` returns `false` — even though "Fertig" is semantically the completion status. Instead, "Blockiert" is treated as done.

### Root Cause

`src/utils/terminal-status.ts`, line 3:
```typescript
const terminalStatus = statuses[statuses.length - 1];  // always picks the last entry
```

The entire convention is documented nowhere. There is no `config.yml` key like `terminalStatus: "Fertig"` — the position in the array is the only signal.

The affected user's config is:
```yaml
statuses:
  - "Offen"
  - "In Arbeit"
  - "Fertig"
  - "Blockiert"   # ← last entry → incorrectly treated as terminal status
```

`"Blockiert"` (Blocked) is a lateral/exceptional state, not a workflow endpoint. Placing it after "Fertig" is a natural and intuitive configuration — the user wants blocked tasks to appear visually distinct on the right side of the board. But the code silently interprets this as "Blockiert = Done".

### Cascading Impact
Because Bugs #1–#4 currently use *hardcoded English checks* rather than `isTerminalStatus`, this bug is currently **masked** on the affected user's board — `"Blockiert"` fails the `includes("done")` check just as `"Fertig"` does, so both statuses are broken equally. Once Bugs #1–#4 are fixed by migrating to `isTerminalStatus`, Bug #5 would immediately surface: tasks marked "Blockiert" would be counted as completed, while "Fertig" tasks would not.

### Fix Options

**Option A — Explicit config key (recommended):**
Add an optional `terminalStatus` key to `config.yml`. Fall back to last-element convention if absent:
```yaml
# config.yml
statuses:
  - "Offen"
  - "In Arbeit"
  - "Blockiert"
  - "Fertig"
terminalStatus: "Fertig"   # explicit, position-independent
```

```typescript
export function getTerminalStatus(config: BacklogConfig): string | null {
    if (config.terminalStatus) return config.terminalStatus;
    const statuses = config.statuses ?? DEFAULT_STATUSES;
    return statuses[statuses.length - 1] ?? null;
}
```

**Option B — Document and enforce the convention:**
Require the completion status to always be last. Add a validation warning at startup if a status containing "done"/"complete" (or matching the previous terminal status) is not last. Low-effort but fragile for non-English boards.

**Option C — Multiple terminal statuses:**
Allow `terminalStatuses: ["Fertig", "Abgebrochen"]` for boards that have multiple end-states (done + cancelled). More expressive but a larger config schema change.

Option A is the minimal breaking-change fix that makes intent explicit and position-independent.

---

## Summary

There are two distinct classes of bugs:

**Class 1 — Partial migration (Bugs #1–#4):** The `isTerminalStatus` utility was built correctly but not applied retroactively to ~12 existing "done" checks. Fix is mechanical — replace hardcoded English comparisons with `isTerminalStatus(status, statuses)`.

**Class 2 — Convention ambiguity (Bug #5):** The utility itself relies on an undocumented, implicit convention (last array element = terminal status) that breaks for boards with non-linear status arrangements. Fix requires either an explicit config key or enforced ordering.

Both classes must be fixed together. Fixing only Class 1 would introduce Class 2 regressions on boards where a non-completion status is listed last.
