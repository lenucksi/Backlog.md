---
id: doc-9
title: 'Project Health: Blocked/Deadlocked Tasks Analysis'
type: specification
created_date: '2026-05-22 18:46'
tags:
  - blocked
  - deadlock
  - statistics
  - dependencies
  - sequences
---
# Project Health: Blocked/Deadlocked Tasks Analysis

> Research date: 2026-05-22
> For: BACK-530 — Project Health: Blocked/Deadlocked Tasks
> Sources: Codebase analysis of src/core/sequences.ts, src/core/statistics.ts, src/utils/terminal-status.ts, src/ui/status-icon.ts, src/web/components/Statistics.tsx, src/web/components/TaskColumn.tsx

---

## 1. How "Blocked" Currently Works

### Type Definition (`src/types/index.ts:293`)
```typescript
blockedStatuses?: string[];
```
The `BacklogConfig` type has an optional `blockedStatuses` array field. There is no dedicated `TaskStatus` enum — status is just `string`. Blocked is not a built-in status.

### Config Loading (`src/file-system/operations.ts:1608-1611, 1677, 1709-1710`)
- Parses `blocked_statuses:` from YAML config as an array of strings
- Returns it as `blockedStatuses` in the parsed config object
- On serialization, outputs `blocked_statuses: ["..."]` only when non-empty
- Config uses `backlog.config.yml` with the key `blocked_statuses`

### Config Migration (`src/core/config-migration.ts`)
- `migrateConfig()` does NOT add default `blockedStatuses` — relies on user configuration
- Config defaults have no `blockedStatuses`

### Status Icon/Styling (`src/ui/status-icon.ts`)
Three-tier matching:
```typescript
// 1. If blockedStatuses is configured, check exact match (case-insensitive)
if (blockedStatuses && blockedStatuses.length > 0) {
    if (blockedStatuses.some((bs) => bs.toLowerCase() === status.toLowerCase())) {
        return { icon: "●", color: "red" };
    }
}
// 2. Hardcoded map with "Blocked" → red dot
// 3. Fallback: if status.toLowerCase().includes("blocked") → red dot
// 4. Default: white circle
```
The styling is used in TUI (terminal icons) and passed via props.

### Board/Web UI Blocked Styling (`src/web/components/TaskColumn.tsx:55-66`)
```typescript
const isBlocked =
    blockedStatuses && blockedStatuses.length > 0
        ? blockedStatuses.some((bs) => bs.toLowerCase() === statusLower)
        : statusLower.includes('blocked') || statusLower.includes('stuck');
```
Same three-tier logic. When a column header's status matches a blocked status, the column badge gets `bg-red-100` styling.

### Board Props Flow
- `BoardPage.tsx` → `Board.tsx` → `TaskColumn.tsx` all pass `blockedStatuses` down as a prop
- `TaskCard.tsx` does NOT receive `blockedStatuses` — visual blocked styling is column-level, not card-level

### MCP Tools (`src/mcp/tools/statistics/handlers.ts`)
- The statistics MCP handler returns `blockedTaskCount` as a number only (no task list)

### Summary
The "blocked" concept is purely a **visual status indicator** (red dot icon, red column badge) and a **count in statistics**. There is no:
- Database-level blocked flag
- Computed/synthesized blocked status from dependencies
- Status-based blocked detection in Statistics (it's dependency-based there)

---

## 2. How Statistics Currently Shows Blocked Tasks

### Core Engine (`src/core/statistics.ts:97-113`)
```typescript
const blockedTasks: Task[] = [];
// ...
if (task.dependencies && task.dependencies.length > 0 && !terminal) {
    const hasBlocking = task.dependencies.some((depId) => {
        const dep = tasks.find((t) => t.id === depId);
        return dep && !isTerminalStatus(dep.status, statuses, terminalStatuses);
    });
    if (hasBlocking) blockedTasks.push(task);
}
// ...
blockedTasks: blockedTasks.slice(0, 5),
```

**The logic:**
1. A task is "blocked" if it has at least one non-terminal dependency (i.e., a dependency whose status is NOT in `terminalStatuses`)
2. If a dependency is missing from the task list, it is silently ignored — not considered blocked
3. Results are **capped to 5 tasks**
4. This is **dependency-based**, NOT status-based

### CLI (`src/commands/statistics.ts`)
- Shows only the count: `Blocked tasks: ${stats.projectHealth.blockedTasks.length}`
- No task list in CLI; no detail on which dependency is blocking what

### REST API (`src/server/handlers/system.ts`)
- Returns full `TaskStatistics` including `projectHealth.blockedTasks` array
- The web UI receives the full list

### Web UI (`src/web/components/Statistics.tsx`)
- Shows blocked count as a red badge in the project health summary row
- Expands to show up to 3 task previews with a "+N more" link
- Each task preview shows: ID, title, created date (clickable to edit)

### TUI (`src/ui/overview-tui.ts`)
- Shows task list in the "Project Health" box with red IDs
- Lists up to 5 tasks
- Plain text fallback shows the same

### MCP (`src/mcp/tools/statistics/handlers.ts`)
- Returns `blockedTaskCount` only — no task details in MCP responses

### All Modalities Summary

| Modality | Blocked Task Display |
|----------|---------------------|
| CLI | Count only |
| TUI | Task list (up to 5) |
| WebUI | Task list (up to 3 + more), clickable |
| MCP | Count only |
| REST | Full task array in JSON |

---

## 3. The Dependency/Sequence Engine's Capability for Deadlock Detection

### Dependency Storage (`src/types/index.ts`)
```
dependencies: string[];
```
Stored in task frontmatter as an array of task ID strings.

### Sequence Engine (`src/core/sequences.ts`)
- `computeSequences(tasks)` uses **Kahn's algorithm** (layered topological sort)
- **Cycle detection already exists** (lines 46-68):
  ```typescript
  while (remaining.size > 0) {
      const layerIds: string[] = [];
      for (const id of remaining) {
          if ((indegRem.get(id) || 0) === 0) layerIds.push(id);
      }
      if (layerIds.length === 0) {
          // Cycle detected; emit all remaining nodes as final layer
          const finalTasks = ...;
          sequences.push({ index: sequences.length + 1, tasks: finalTasks });
          break;
      }
      // ... normal layering
  }
  ```
- When no node has indegree 0 but nodes remain, a **cycle exists**
- Cycles are handled gracefully: remaining nodes are emitted as a final "garbage" sequence
- The algorithm currently does NOT distinguish between "cycle participants" and "dependents of cycles"
- Tests exist (`src/test/sequences-comprehensive.test.ts:33-80`) covering:
  - Simple 3-node cycle (A→B→C→A)
  - Self-referencing dependency
  - Complex interleaved cycles (4 nodes, partial overlap)

### What's Missing
- **No separate deadlock detection utility exists** — cycle detection is embedded in `computeSequences` and not exposed as a standalone function
- **No dependency graph visualization or validation on task creation** — tasks can be created with dependencies that form cycles with no validation at write time
- **No API to return cycle-participating tasks**
- **No CLI/TUI/WebUI surface for "tasks in deadlocked cycles"**
- **No "deadlock" terminology anywhere in the codebase**

---

## 4. Recommended UX for Blocked + Deadlocked Task Lists

### Blocked Tasks (Status-Based)
Enhance the existing dependency-based detection:

1. **Statistics page** — Add a "Blocked Tasks" section (not just count):
   - WebUI: Expand the existing blocked summary row into a full section with dependency details
   - CLI: Show task list with dependency info (e.g., `TASK-3 — "Feature X" [dep: TASK-1 "In Progress"]`)
   - MCP: Return the blocked task list in addition to the count
   - TUI: Already shows the list — keep as-is

2. **Blocking indicator on cards** — Show visual indicator on task cards when blocked by dependencies (not just status-based)

### Deadlocked Tasks (Circular Dependency Detection)
New functionality:

1. **New `detectDeadlocks(tasks)` function** in `src/core/statistics.ts` or new `src/core/deadlock.ts`:
   - Uses Tarjan's algorithm or DFS with coloring to find strongly connected components (SCCs) of size > 1
   - Self-loops (task depends on itself) also count
   - Returns the set of tasks in each cycle with metadata about the cycle path

2. **Statistics integration:**
   ```
   projectHealth: {
       blockedTasks: Task[],       // existing
       deadlockedTasks: Task[],    // new — all tasks in cycles
       cycles: Cycle[],            // new — [{ path: ["A","B","C"], tasks: [Task, Task, Task] }]
   }
   ```

3. **UI Presentation:**
   - WebUI Statistics: New "Deadlocked Tasks" section with cycle chain visualization
   - CLI `backlog stats`: Show count + task IDs per cycle
   - TUI Overview: New "Deadlocked" box in Project Health
   - MCP: Return `deadlockedTaskCount` and cycle paths
   - Board: Warning banner when any task is in a deadlock

4. **Terminology:**
   - **"Blocked"** = Task has at least one unresolved dependency (waiting on something)
   - **"Deadlocked"** or **"Circular Dependency"** = Task is in a dependency cycle (can never be satisfied)

### Effort Estimate

| Component | Effort |
|-----------|--------|
| `detectDeadlocks()` function | 1-2 days |
| Statistics integration | 0.5 day |
| WebUI Statistics update | 1 day |
| CLI `backlog stats` update | 0.5 day |
| TUI Overview update | 0.5 day |
| MCP statistics tool update | 0.25 day |
| Board warning banner | 1 day |
| Dependency validation (write-time) | 1 day |
| Dependency display on TaskCards | 0.5 day |
| Testing across all modalities | 1 day |
| Documentation | 0.5 day |
| **Total** | **~7 days** |
