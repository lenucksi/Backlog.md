# Bug Report: "Blocked" Status — Two Unconnected Concepts, Both Broken for Custom Names

**Date:** 2026-05-06
**Scope:** Addendum to `backlog-md-i18n-bug-report.md`
**Severity:** Medium (visual) + High (statistics, already covered as Bug #3)

---

## Core Finding: "Blocked" Is Two Independent Concepts

Backlog.md uses the word "blocked" for two entirely separate mechanisms that are **not connected to each other**:

| | Status name is "Blocked" | Task has unresolved dependencies |
|---|---|---|
| Appears in Statistics `blockedTasks` | **No** | **Yes** |
| Gets red icon / red badge | **Yes** (English only) | **No** |

A task named "Blocked" with no dependencies never appears in the blocked statistics.
A task named "Offen" with an open dependency always does.

---

## Concept 1 — "Blocked" as Visual Convention (status-icon.ts, TaskColumn.tsx)

### Bug #6 — Custom "Blocked" Names Get No Special Styling

**`src/ui/status-icon.ts`** uses a hardcoded exact-match lookup:
```typescript
const statusMap: Record<string, StatusStyle> = {
    Done:          { icon: "✔", color: "green" },
    "In Progress": { icon: "◒", color: "yellow" },
    Blocked:       { icon: "●", color: "red" },   // exact key — "Blockiert" misses this
    "To Do":       { icon: "○", color: "white" },
};
return statusMap[status] || { icon: "○", color: "white" };  // silent fallback
```

**`src/web/components/TaskColumn.tsx:88`** uses substring matching for badge colors:
```typescript
if (statusLower.includes('blocked') || statusLower.includes('stuck')) {
    return 'bg-red-100 ... text-red-800 ...';
}
```

**Result for "Blockiert":**
- `statusMap["Blockiert"]` → no match → white circle `○` instead of red dot `●`
- `"blockiert".includes("blocked")` → `false` → no red badge

Same i18n pattern as the "Done" bugs — hardcoded English keywords, no config awareness.

### Fix for Bug #6

Both files need to check whether the status matches the configured "blocked equivalent" from config, not an English string. This requires either:

**Option A — Config key `blockedStatus`:**
```yaml
# config.yml
blockedStatus: "Blockiert"
```
Then pass config into `getStatusStyle()` and `getStatusBadgeClass()`.

**Option B — Substring heuristic extended with config alias:**
Keep the `includes("blocked")` fallback for English boards, add config override for custom names.

**Option C — Accept that icon/badge styling is cosmetic-only** and document that custom status names receive the default (neutral) styling unless they contain English keywords. Lower-effort, lower-impact.

---

## Concept 2 — "Blocked" as Dependency Logic (statistics.ts)

This is **already documented as Bug #3** in the main report. Summary:

`statistics.ts:110-120` computes `blockedTasks` purely from the dependency graph:
- A task is blocked if it has at least one dependency whose status is not `"Done"`
- The task's own status name is irrelevant — "Blockiert", "Offen", "In Progress" are all treated identically
- The bug: `dep.status !== "Done"` is a hardcoded English check → "Fertig" dependencies are never considered resolved → all tasks with any dependency are incorrectly flagged as blocked

This concept is **correct by design** (blocked = has open dependencies, regardless of label) but broken by the hardcoded `"Done"` string. Fix: replace with `isTerminalStatus(dep.status, statuses)`.

---

## Implication for Fix-C (Multiple Terminal Statuses)

"Blockiert" / "Blocked" is **not a terminal status** and should never appear in `terminalStatuses`. The dependency-resolution logic already operates independently of the status name — it only needs to know what "done" means, not what "blocked" means.

The two fixes are orthogonal:
1. **Dependency logic (Bug #3):** Fix `"Done"` hardcoding → `isTerminalStatus(dep.status, statuses)`
2. **Visual styling (Bug #6):** Add config-aware blocked-status detection for icons/badges

Neither fix requires the other.

---

## Summary

| Bug | Location | Root Cause | Fix Complexity |
|---|---|---|---|
| #3 (dependency logic) | `statistics.ts:112-116` | `!== "Done"` hardcoded | Low — use `isTerminalStatus` |
| #6 (visual styling) | `status-icon.ts`, `TaskColumn.tsx:88` | English-only lookup / substring | Medium — needs config key or heuristic |
