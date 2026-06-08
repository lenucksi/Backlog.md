Now I have all the data. Here is the complete analysis.

---

# COMPLETE ANALYSIS: Colored Labels Feature (BACK-486/487/488)

## 1. `LabelConfig` Type Definition

**File:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/types/index.ts`
**Lines 292-295:**

```typescript
export interface LabelConfig {
    name: string;
    color?: string;
}
```

This is clean. Also on lines 297-306 there is a helper:

```typescript
export function resolveLabelColor(name: string, config: BacklogConfig): string | null {
    for (const label of config.labels) {
        if (typeof label === "string") {
            if (label === name) return null;
        } else {
            if (label.name === name) return label.color ?? null;
        }
    }
    return null;
}
```

And `BacklogConfig.labels` at line 315:
```typescript
labels: Array<string | LabelConfig>;
```

---

## 2. Where `labels` Is Used in Type Definitions

All in `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/types/index.ts`:

| Type | Line | Field | Type |
|------|------|-------|------|
| `Task` | 34 | `labels` | `string[]` |
| `MilestoneBucket` | 66 | `label` | `string` |
| `TaskCreateInput` | 96 | `labels` | `string[]` (optional) |
| `TaskUpdateInput` | 119 | `labels` | `string[]` (optional) |
| `TaskListFilter` | 161 | `labels` | `string[]` (optional) |
| `Decision` | 175 | `labels` | `string[]` (optional) |
| `Document` | 196 | `labels` | `string[]` (optional) |
| `DocumentCreateInput` | 209 | `labels` | `string[]` (optional) |
| `DocumentUpdateInput` | 219 | `labels` | `string[]` (optional) |
| `TaskFilterSpec` | 237 | `labels` | `string[]` (optional) |
| `BacklogConfig` | 315 | `labels` | `Array<string \| LabelConfig>` |

**Key observation:** All entity types (`Task`, `Document`, `Decision`) use `labels: string[]` -- only `BacklogConfig` uses `Array<string | LabelConfig>`. This means entity labels are always plain strings; color info lives only in config. This is the correct design but causes type friction when config labels are treated as simple strings.

---

## 3. `src/commands/label.ts` - Full File

**File:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/commands/label.ts` (186 lines)

**3 ERRORS:**

- **Line 34 (TS2339):** `Property 'name' does not exist on type 'never'`
  ```typescript
  config.labels = Array.from(knownLabels).sort((a, b) =>
      (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
  );
  ```
  **Problem:** `knownLabels` is `Set<string>`, so after `Array.from()` the elements are `string`, but the `typeof a === "string" ? a : a.name` ternary is dead code that narrows `a` to `never` in the else branch since it's always a string. The `sort` comparator should just be `a.localeCompare(b)` without the ternary.

- **Line 148 (TS2345):** `Argument of type '{ id: string; labels: string[]; }' is not assignable to parameter of type 'DocumentUpdateInput'`
  ```typescript
  await core.updateDocumentFromInput({ id: doc.id, labels: updatedLabels });
  ```
  **Problem:** `DocumentUpdateInput` has required field `content: string` (line 215 of index.ts). The label rename only wants to update labels, not content. **Fix needed:** Either make `content` optional in `DocumentUpdateInput` or fetch current content and pass it through.

- **Line 156 (TS2339):** `Property 'editDecision' does not exist on type 'Core'`
  ```typescript
  await core.editDecision(decision.id, { labels: updatedLabels });
  ```
  **Problem:** Method `Core.editDecision()` does not exist. **Fix needed:** Add the method to `Core`.

---

## 4. MCP Label Tools

**Directory:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/mcp/tools/labels/`
**Files:** `index.ts` (67 lines), `handlers.ts` (134 lines), `schemas.ts` (56 lines)

### `handlers.ts` - 8 ERRORS:

- **Lines 36, 57, 65, 121 (TS2339):** `.toLowerCase()` on `string | LabelConfig`
  ```typescript
  (config.labels ?? []).some((l) => l.toLowerCase() === input.name.toLowerCase())
  ```
  **Fix:** Use `typeof l === "string" ? l.toLowerCase() : l.name.toLowerCase()`

- **Lines 42, 73 (TS2339):** `.localeCompare()` on `string | LabelConfig`
  ```typescript
  config.labels.sort((a, b) => a.localeCompare(b))
  ```
  **Fix:** Extract `.name` from LabelConfig before comparing

- **Line 90 (TS2339):** `Property 'listDocs' does not exist on type 'FileSystem'`
  ```typescript
  const docs = await this.core.filesystem.listDocs();
  ```
  **Fix:** `FileSystem` only has `listDocuments()`. Change to `listDocuments()`.

- **Line 94 (TS2339):** `Property 'editDoc' does not exist on type 'McpServer'`
  ```typescript
  await this.core.editDoc(doc.id, { labels: updatedLabels });
  ```
  **Fix:** Use `core.updateDocumentFromInput(...)` (with `content` field populated), or add an `editDoc()` wrapper.

- **Line 102 (TS2339):** `Property 'editDecision' does not exist on type 'McpServer'`
  ```typescript
  await this.core.editDecision(decision.id, { labels: updatedLabels });
  ```
  **Fix:** Add `editDecision()` to the `McpServer` (Core) class.

### `index.ts` - 3 ERRORS:

- **Lines 30, 41, 52 (TS2352):** Type cast issues
  ```typescript
  async (input) => handlers.addLabel(input as LabelAddArgs),
  ```
  **Problem:** `input` is `Record<string, unknown>`, `LabelAddArgs` requires `name: string`. Since `noUncheckedIndexedAccess` is on, the overlap check fails. **Fix:** Add `// @ts-expect-error` or use `unknown` cast first:
  ```typescript
  async (input) => handlers.addLabel(input as unknown as LabelAddArgs),
  ```

### `schemas.ts` - 1 ERROR:

- **Line 1 (TS2305):** `Module '"../../types.ts"' has no exported member 'JsonSchema'`
  ```typescript
  import type { JsonSchema } from "../../types.ts";
  ```
  **Fix:** Change import path. `JsonSchema` lives at `../../validation/validators.ts`, not `../../types.ts`. Should be:
  ```typescript
  import type { JsonSchema } from "../../validation/validators.ts";
  ```

---

## 5. `src/server/handlers/config.ts` - Label-Related Parts

**File:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/server/handlers/config.ts` (181 lines)

**9 ERRORS:**

- **Lines 78, 101, 107, 159 (TS2339):** `.toLowerCase()` on `string | LabelConfig`
  Same pattern as MCP handlers.

- **Lines 81, 112 (TS2339):** `.localeCompare()` on `string | LabelConfig`
  Same pattern as MCP handlers.

- **Line 129 (TS2339):** `Property 'listDocs' does not exist on type 'FileSystem'`
  ```typescript
  const docs = await ctx.core.filesystem.listDocs();
  ```
  **Fix:** Change to `listDocuments()`.

- **Line 133 (TS2339):** `Property 'editDoc' does not exist on type 'Core'`
  ```typescript
  await ctx.core.editDoc(doc.id, { labels: updatedLabels });
  ```
  **Fix:** Use `updateDocumentFromInput(...)`.

- **Line 141 (TS2339):** `Property 'editDecision' does not exist on type 'Core'`
  ```typescript
  await ctx.core.editDecision(decision.id, { labels: updatedLabels });
  ```
  **Fix:** Add `editDecision()` to `Core`.

---

## 6. Test Files Related to Labels

| File | Lines | Description |
|------|-------|-------------|
| `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/test/label-filter.test.ts` | 44 | Tests for `collectAvailableLabels`, `formatLabelSummary`, `labelsToLower` |
| `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/test/task-search-label-filter.test.ts` | 62 | Tests for label filtering in task search |
| `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/test/web-task-list-labels-menu.test.tsx` | 257 | React component tests for label filter menu in TaskList |

**Status:** These 3 label test files compile cleanly (no tsc errors). They all treat labels as `string[]` (matching entity types, not config type).

---

## 7. `src/utils/task-edit-builder.ts` Line 26 Area

**File:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/utils/task-edit-builder.ts`
**Lines 20-27:**

```typescript
function collectChecklistAdditions(items: string[] | undefined): { text: string; checked: false }[] | undefined {
    if (!items?.length) return undefined;
    const additions = items
        .map((text) => String(text).trim())
        .filter((text) => text.length > 0)
        .map((text) => ({ text, checked: false }));
    return additions.length > 0 ? additions : undefined;
}
```

**1 ERROR at line 26 (TS2322):**
Return type says `checked: false` (literal `false`), but the actual object literal `{ text, checked: false }` infers `checked: boolean`. **Fix:** Change return type to `{ text: string; checked: boolean }[]` or cast.

**NOT related to labels** - this is a pre-existing bug.

---

## 8. Missing Methods

### `FileSystem.listDocs()` -- DOES NOT EXIST

Only `FileSystem.listDocuments()` exists at line 975 of `operations.ts`:
```typescript
async listDocuments(): Promise<Document[]> { ... }
```

**Broken callers:** `mcp/tools/labels/handlers.ts:90`, `server/handlers/config.ts:129`

### `Core.editDoc()` -- DOES NOT EXIST

No method named `editDoc` on Core. The closest equivalent is `updateDocumentFromInput(input: DocumentUpdateInput)` at line 2566 of `backlog.ts`.

**Broken callers:** `server/handlers/config.ts:133`, `mcp/tools/labels/handlers.ts:94`

### `Core.editDecision()` -- DOES NOT EXIST

No method named `editDecision` on Core. The existing decision methods are:
- `resolveDecision(decisionId, autoCommit?)` (line 2441)
- `updateDecisionFromContent(decisionId, content, autoCommit?)` (line 2455)
- `createDecision(decision, autoCommit?)`
- `createDecisionWithTitle(title, autoCommit?)` (line 2487)

**Broken callers:** `commands/label.ts:156`, `server/handlers/config.ts:141`, `mcp/tools/labels/handlers.ts:102`

### `BunFile` type -- NOT RESOLVABLE

**File:** `src/server/index.ts`, lines 287, 302

`BunFile` is a Bun global type, not imported. The file imports `Server, ServerWebSocket` from `"bun"` (line 1) but `BunFile` is part of `Bun` namespace. The `tsconfig.json` has `"typeRoots": ["./src/types", "./node_modules/@types"]` which may not include bun types properly.

**Fix:** Either import `type { BunFile } from "bun"` or use the `Bun.BunFile` namespace reference, or install `@types/bun`.

### `onNavigateToTask` in TaskDetailsModal

**File:** `src/web/components/TaskDetailsModal.tsx`, lines 685, 704

Error TS2304: "Cannot find name 'onNavigateToTask'". The prop IS declared in the interface (line 28) and IS passed from App.tsx (line 667). The issue is likely a scoping bug -- possibly the `onNavigateToTask` variable is not being captured in a nested closure. However, examining the code (line 685: `onClick={() => onNavigateToTask?.(task.parentTaskId!)}`), it should work as a destructured prop. This may be a false positive from tsc strict checking in JSX callbacks.

---

## 9. `src/core/init.ts` Lines 148-260 - Duplicate Keys

**File:** `/home/jo/kit/claude-code-llm-kram/Backlog.md/src/core/init.ts`

**Lines 149-154 (TS2783 x2):**
```typescript
const config: BacklogConfig = {
    statuses: ["To Do", "In Progress", "Done"],   // line 150
    labels: [],                                     // line 151
    defaultStatus: "To Do",
    maxColumnWidth: 20,
    ...(existingConfig ?? ({} as BacklogConfig)),   // line 154 - OVERWRITES lines 150-151
    projectName,
    ...
```
**Problem:** `statuses` and `labels` are defined TWICE in the same object literal -- first at lines 150-151 as defaults, then again via the spread of `existingConfig` at line 154. The spread always wins, making the first definitions dead code.

**Fix:** Remove the hardcoded defaults at lines 150-151, or restructure: use a separate defaults object and merge after the spread.

**Line 257 (TS2322):**
```typescript
function resolveConfigLocation(source: string | undefined, configOption: string | undefined): "folder" | "root" {
    return configOption ?? (source === "custom" ? "root" : "folder");
}
```
Return type says `"folder" | "root"` but the function returns `string` (from `configOption`). **Fix:** `configOption` needs to be typed as `"folder" | "root" | undefined` or cast the result.

---

## 10. `src/server/index.ts` Lines 287-302 - `BunFile`

**Lines 287, 302:**
```typescript
private async resolveHtml(): Promise<BunFile> {  // TS2304: Cannot find name 'BunFile'
    ...
    const bundled = Bun.file(join(binDir, "index.html"));
    ...
}

private async resolveAsset(webPath: string): Promise<BunFile | null> {  // TS2304: Cannot find name 'BunFile'
    ...
}
```

**Fix:** Add `import type { BunFile } from "bun";` at the top. Or use `ReturnType<typeof Bun.file>` or just inline `Bun.file(...)` return without typing.

---

## 11. `src/server/router.ts` Lines 153-160 - `handleAddLabel` etc.

**Lines 153-160:**
```typescript
"/api/config/labels": {
    GET: async () => await config.handleListLabels(),
    POST: async (req: Request) => await config.handleAddLabel(req),    // ERROR
},
"/api/config/labels/:name": {
    PUT: async (req) => await config.handleRenameLabel(req),            // ERROR
    DELETE: async (req) => await config.handleRemoveLabel(req),         // ERROR
},
```

**3 ERRORS (TS2339):** The `RouteHandlers['config']` type (router.ts lines 49-54) only declares:
```typescript
config: {
    handleGetStatuses: () => Promise<Response>;
    handleGetConfig: () => Promise<Response>;
    handleUpdateConfig: (req: Request) => Promise<Response>;
    handleListLabels: () => Promise<Response>;
};
```

Missing: `handleAddLabel`, `handleRenameLabel`, `handleRemoveLabel`.

**Fix:** Add these three method signatures to the `RouteHandlers['config']` type.

---

## 12. Test Files with Errors

### `src/test/commands-config-cov.test.ts` - 16 ERRORS (TS2322)

**Lines 44-60:** Array literal lacks proper typing:
```typescript
const keys: Array<{ key: string }> = [
    "projectName",    // TS2322: Type 'string' not assignable to type '{ key: string }'
    ...
];
```
**Fix:** Either change the type to `string[]` and drop the loop's `.key` access at line 63, or wrap elements as `{ key: "projectName" }`.

**Line 63:** `key` (which is `{ key: string }`) is used as a string -- reverse mismatch.

### `src/test/assignee.test.ts` - 3 ERRORS (TS2769, TS2352)

- **Line 8:** `expect(task.assignee).toEqual(["user1"])` -- `assignee` is `string`, but `toEqual` expects `string`.
- **Lines 25-26:** `null` cast to `string | string[]` and `never[]` not matching `null`.

**Fix:** The test types are loose. Could add `// @ts-expect-error` or make the test objects properly typed.

---

## Complete Error Categorization (Non-test, Non-worktree)

Counting from the tsc output: **51 errors** in `src/` excluding `src/test/` and `worktrees/`.

### By Category:

| Category | Error Count | Files | Root Cause |
|----------|-------------|-------|------------|
| **A. `string | LabelConfig` type narrowing** | ~17 | handlers/config.ts, mcp/labels/handlers.ts, commands/label.ts, ui/task-viewer-with-search.ts, web/App.tsx, web/Settings.tsx | `.toLowerCase()`, `.localeCompare()` on union type |
| **B. Missing methods (`listDocs`, `editDoc`, `editDecision`)** | 5 | mcp/labels/handlers.ts, server/handlers/config.ts, commands/label.ts | Feature gap -- never implemented |
| **C. Router type mismatch** | 3 | server/router.ts | `RouteHandlers['config']` missing 3 methods |
| **D. `BunFile` type** | 2 | server/index.ts | Missing import |
| **E. `JsonSchema` import** | 1 | mcp/labels/schemas.ts | Wrong import path |
| **F. MCP tool type casts** | 3 | mcp/labels/index.ts | `Record<string, unknown>` not overlapping with args types |
| **G. Init.ts duplicate keys** | 3 | core/init.ts | Logic bug + return type mismatch |
| **H. DocUpdateInput requires `content`** | 1 | commands/label.ts | `DocumentUpdateInput.content` is required |
| **I. `updateDecisionFromContent` `title: {}`** | 1 | core/backlog.ts:2484 | Computed spread type issue |
| **J. `newIndex` in reorderTask** | 1 | test/backlog-coverage.test.ts | Param type doesn't have `newIndex` |
| **K. `server/utils.ts` `string | string[]`** | 2 | server/utils.ts | Assigning `string | string[]` to `string[]`/`string` field |
| **L. Various test pre-existing** | ~12 | Many test files | Missing fields, type mismatch in test data |

---

## Can the Feature Work at Runtime Despite Type Errors?

**YES, mostly.** The `LabelConfig` type (`{ name: string; color?: string }`) is designed so that at the config level, labels can be either plain strings or objects with colors. Entity-level labels (`Task.labels`, `Document.labels`, `Decision.labels`) are always `string[]`. The `parseLabelArray` function in `operations.ts` correctly handles both formats. The `resolveLabelColor` helper exists.

**What would work at runtime:**
1. Reading/parsing `label: { name: "bug", color: "#ff0000" }` from `backlog.config.yml` -- the YAML parser and frontmatter parser handle this
2. Listing labels (CLI `backlog label list`, REST `/api/config/labels` GET, MCP `backlog_label_list`)
3. Filtering tasks by label name

**What would fail at runtime:**
1. Sorting labels when `LabelConfig` objects are mixed with strings -- the `.localeCompare()` without type guard would crash
2. `listDocs()` call would be a runtime error from missing method
3. `editDoc()` and `editDecision()` calls would crash with method-not-found errors
4. Label rename operations across docs/decisions would fail entirely
5. WebUI Settings page rendering `{label}` directly would show `[object Object]` when labels are LabelConfig objects
6. `prompt("Rename label to:", label)` would show `[object Object]` for LabelConfig labels

**Summary:** Basic read operations work. All write operations that touch docs/decisions are broken. The WebUI Settings label management is partially broken.

---

## Fix Priority Order

1. **Router type** (3 errors) -- easiest, just add 3 declarations
2. **MCP schemas import** (1 error) -- fix path
3. **MCP tool casts** (3 errors) -- `as unknown as X`
4. **`BunFile`** (2 errors) -- add import type
5. **Init.ts** (3 errors) -- remove duplicate keys, fix return type
6. **`string | LabelConfig` narrowing** (17 errors) -- add `typeof` guards in all handlers
7. **Missing `editDecision()`** -- add to Core class (uses `createDecision` internally)
8. **`DocumentUpdateInput.content` required** -- make optional OR pass current content
9. **`listDocs()` → `listDocuments()`** -- rename in all callers
10. **`editDoc()` → `updateDocumentFromInput()`** -- update all callers to pass `content` too
11. **`server/utils.ts` assignee/labels typing** -- fix filter type assignments
12. **WebUI Settings** -- render label names from LabelConfig objects properly
