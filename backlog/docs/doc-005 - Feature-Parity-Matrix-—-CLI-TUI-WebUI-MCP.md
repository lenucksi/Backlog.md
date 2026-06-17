---
id: doc-005
title: Feature Parity Matrix — CLI / TUI / WebUI / MCP
type: other
created_date: '2026-05-17 00:00'
updated_date: '2026-06-17 12:30'
tags:
  - research
  - engineering-consistency
  - parity
  - cli
  - tui
  - webui
  - mcp
---
# Feature Parity Matrix — CLI / TUI / WebUI / MCP

> Research pass 2026-05-17. Updated 2026-05-22 (v2) after completed refactoring tasks. Updated 2026-05-22 (v2.1) — corrected MCP Demote status. Updated 2026-06-17 (v2.2) — added Labels section, MCP label color tools, WebUI terminal/blocked statuses (BACK-562, BACK-563).
>
> Legend: ✅ full support · ⚠️ partial / limited · ❌ missing

---

## Matrix

### Tasks

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| Create | ✅ | ❌ | ✅ | ✅ | TUI shows help to use CLI (`src/ui/task-viewer-with-search.ts`) |
| List / filter | ✅ | ✅ | ✅ | ✅ | |
| View details | ✅ | ✅ | ✅ | ✅ | |
| Edit (all fields) | ✅ | ⚠️ | ✅ | ✅ | TUI opens `$EDITOR`; no field-level form |
| Complete (mark Done) | ✅ | ✅ | ✅ | ✅ | CLI: resolved by BACK-516 (`task complete`) |
| Archive | ✅ | ✅ | ✅ | ✅ | |
| Demote to draft | ✅ | ❌ | ❌ | ✅ | CLI + MCP: registered tool + command exist. WebUI: missing (BACK-419) |
| Reorder (ordinal) | ⚠️ | ❌ | ✅ | ⚠️ | CLI + MCP support ordinal in create/edit; no dedicated reorder |
| Bulk update | ✅ | ❌ | ❌ | ❌ | CLI `task edit` with multiple IDs |
| Cleanup (by age) | ✅ | ❌ | ✅ | ❌ | CLI `task cleanup`; WebUI has preview + execute endpoints |
| Full-text search | ✅ | ✅ | ✅ | ✅ | |
| Filter: status | ✅ | ✅ | ✅ | ✅ | |
| Filter: assignee | ✅ | ✅ | ✅ | ✅ | |
| Filter: label | ✅ | ✅ | ✅ | ✅ | |
| Filter: milestone | ✅ | ✅ | ✅ | ✅ | |
| Filter: priority | ✅ | ✅ | ✅ | ✅ | |
| Filter: modifiedFile | ✅ | ❌ | ✅ | ✅ | |
| Filter: cross-branch | ✅ | ❌ | ✅ | ❌ | |
| Acceptance criteria (check/uncheck) | ✅ | ❌ | ✅ | ✅ | |
| Definition of Done (check/uncheck) | ✅ | ❌ | ✅ | ✅ | |

### Drafts

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| Create draft | ✅ | ❌ | ⚠️ | ⚠️ | WebUI + MCP: only via `task create` with `status=Draft` |
| List drafts | ✅ | ⚠️ | ✅ | ⚠️ | TUI shows drafts in unified view; MCP `listTasks` includes drafts with flag |
| View draft | ✅ | ✅ | ✅ | ✅ | |
| Edit draft | ✅ | ⚠️ | ✅ | ✅ | TUI via `$EDITOR` |
| Archive draft | ✅ | ✅ | ❌ | ✅ | |
| Promote draft → task | ✅ | ❌ | ✅ | ✅ | |

### Milestones

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| List (active) | ✅ | ❌ | ✅ | ✅ | |
| List (archived) | ✅ | ❌ | ✅ | ✅ | |
| Create | ❌ | ❌ | ✅ | ✅ | CLI only has list + archive |
| Rename | ❌ | ❌ | ✅ | ✅ | |
| Archive | ✅ | ❌ | ✅ | ✅ | |
| Remove | ❌ | ❌ | ✅ | ✅ | |
| View (with task counts) | ⚠️ | ❌ | ✅ | ✅ | CLI shows milestones in task list context only |

### Documents

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| Create | ✅ | ❌ | ✅ | ✅ | CLI opens `$EDITOR` for content |
| List | ✅ | ❌ | ✅ | ✅ | |
| View | ✅ | ❌ | ✅ | ✅ | |
| Update | ✅ | ❌ | ✅ | ✅ | |
| Search | ✅ | ❌ | ✅ | ✅ | |
| Archive | ✅ | ❌ | ❌ | ✅ | CLI + MCP: resolved by BACK-516/BACK-489 |
| Delete (permanent) | ✅ | ❌ | ❌ | ✅ | CLI + MCP: resolved by BACK-516/BACK-489 |

### Decisions

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| Create | ✅ | ❌ | ✅ | ❌ | CLI: title + --status only; MCP: no create tool |
| List | ✅ | ❌ | ✅ | ✅ | CLI + MCP: resolved by BACK-515 |
| View | ✅ | ❌ | ✅ | ✅ | CLI + MCP: resolved by BACK-515 |
| Supersede | ✅ | ❌ | ✅ | ✅ | CLI + MCP: resolved by BACK-515 |
| Edit | ⚠️ | ❌ | ✅ | ❌ | WebUI: content-based raw markdown save (human edit). CLI/MCP: immutable pattern, use supersede |
| Resolve (close without successor) | ❌ | ❌ | ❌ | ❌ | No "supersede to nirvana" exists in any modality |

### Board / Kanban

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| View (status columns) | ✅ | ✅ | ✅ | ❌ | |
| Filter (priority / label / milestone) | ⚠️ | ✅ | ✅ | ❌ | CLI board is read-only export |
| Group by milestone | ❌ | ❌ | ✅ | ❌ | |
| Reorder (drag & drop) | ❌ | ❌ | ✅ | ❌ | |
| Export to file | ✅ | ❌ | ❌ | ❌ | CLI `board --output` |

### Sequences

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| List sequences | ✅ | ✅ | ✅ | ❌ | |
| View sequence details | ✅ | ✅ | ✅ | ❌ | |
| Move task in sequence | ❌ | ❌ | ✅ | ❌ | WebUI only (`/api/sequences/move`) |
| Set sequence manually | ⚠️ | ❌ | ❌ | ❌ | CLI `sequence set` |

### Configuration

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| View all config | ✅ | ❌ | ✅ | ❌ | |
| Get specific key | ✅ | ❌ | ✅ | ❌ | |
| Set config key | ✅ | ❌ | ✅ | ❌ | |
| Advanced config wizard | ✅ | ❌ | ❌ | ❌ | CLI `configure` command |

### Labels

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| List | ✅ | ✅ | ✅ | ✅ | |
| Add (with optional color) | ✅ | ✅ | ✅ | ✅ | CLI + MCP: `backlog label add`; WebUI: inline form with color picker |
| Rename (preserves color) | ✅ | ❌ | ✅ | ✅ | CLI + MCP: fixed by BACK-563 (color no longer lost) |
| Remove | ✅ | ✅ | ✅ | ✅ | |
| Set/change color | ✅ | ❌ | ✅ | ✅ | MCP: new `backlog_label_set_color` tool (BACK-563); WebUI: inline color picker |
| Remove color | ✅ | ❌ | ✅ | ✅ | MCP: new `backlog_label_remove_color` tool (BACK-563) |

### Statistics & Other

| Operation | CLI | TUI | WebUI | MCP | Notes |
|---|---|---|---|---|---|
| Task statistics | ✅ | ❌ | ✅ | ❌ | CLI: resolved by BACK-516 (`backlog stats`) |
| Project overview | ✅ | ⚠️ | ❌ | ⚠️ | TUI via splash; MCP via workflow instructions |
| Init project | ✅ | ❌ | ✅ | ❌ | |
| Definition of Done defaults (get/set) | ✅ | ❌ | ❌ | ✅ | MCP has dedicated DoD tools |

---

## Top Remaining Gaps

| # | Gap | Modalities affected | Impact |
|---|---|---|---|
| **1** | TUI cannot create anything (tasks, drafts, documents, milestones, decisions) | TUI | High — users must context-switch to CLI for all creation |
| **2** | Decision create + resolve missing in MCP; resolve missing everywhere | MCP, All | High — MCP agents cannot create decisions; no resolution workflow |
| **3** | Document archive/delete missing in WebUI | WebUI | Medium — documents must be managed via CLI or MCP |
| **4** | Statistics missing in TUI and MCP | TUI, MCP | Medium — no interactive or scriptable stats access from these surfaces |
| **5** | CLI lacks milestone create/rename/remove | CLI | Medium — milestone lifecycle requires WebUI or MCP |
| **6** | Board + Kanban operations missing in MCP entirely | MCP | Medium — MCP agents have no board view or interaction |
| **7** | Sequences management (move) is WebUI-only | CLI, TUI, MCP | Low-medium |
| **8** | Cross-branch task filtering not in MCP | MCP | Low |
| **9** | TUI lacks milestone list/view | TUI | Medium — milestone awareness requires command line |
| **10** | Demote to draft not available in WebUI | WebUI | Low (BACK-419 tracking) |

---

## Gaps Resolved Since v1

| Prior Gap | Resolution | Task(s) |
|---|---|---|
| CLI lacked `task complete` command | Added `task complete <id1> [id2...]` | BACK-516 |
| CLI lacked `stats` (statistics) | Added `backlog stats` with `--json` and `--milestone` | BACK-516 |
| CLI lacked `decision list` / `decision view` | Added `decision list` + `decision view` with filtering | BACK-515 |
| CLI lacked decision supersede pattern | Added `decision supersede` with editor workflow | BACK-515 |
| CLI lacked `doc archive` / `doc delete` | Added `doc archive` + `doc delete` with `--force` | BACK-516, BACK-489 |
| MCP had no decisions support at all | Added `decision_list`, `decision_view`, `decision_supersede` tools | BACK-515 |
| MCP lacked `document_archive` / `document_delete` | Added archive + delete tools | BACK-489, BACK-516 |
| MCP lacked `task_complete` tool | Added `task_complete` | BACK-516 |
| MCP lacked milestone create/rename/remove | Pre-existing (v1 doc was inaccurate — MCP already had these) | — |
| CLI reorder via ordinal | CLI had `--ordinal` in create + edit (v1 doc missed this) | — |
| Documents missing delete/archive in all modalities | Resolved in CLI + MCP; WebUI still pending | BACK-516, BACK-489 |
| CLI `label rename` + MCP `backlog_label_rename` lost color on `{name, color}` objects | Fixed: color preserved on rename (BACK-563) | BACK-563 |
| MCP lacked label color management | Added `backlog_label_set_color` + `backlog_label_remove_color` tools (BACK-563) | BACK-563 |
| `terminalStatuses` + `blockedStatuses` missing in WebUI config | Added tag-select fields in Settings page (BACK-562) | BACK-562 |

---

## Proposed Follow-up Stubs (Updated v2)

**STUB-P1 — Add milestone create/rename/remove to CLI**
CLI only has `milestone list` and `milestone archive`. Add `create`, `rename`, and `remove` sub-commands for lifecycle parity with WebUI and MCP.
*Scope: `src/commands/milestone.ts`, ~80 lines.*

**STUB-P2 — Add decision resolve ("supersede to nirvana")**
Add `decision resolve <id>` to CLI + MCP + WebUI that marks a decision as resolved/closed without creating a successor (no supersedes/supersededBy links). This completes the decision lifecycle: create → supersede → resolve.
*Scope: MCP handler + schema (~50 lines), CLI command (~20 lines), WebUI button + endpoint.*

**STUB-P3 — Add document archive/delete to WebUI**
WebUI has create, read, update but no archive or delete. Add REST endpoints and UI buttons.
*Scope: `src/server/handlers/documents.ts` + `src/server/router.ts`, ~30 lines + frontend.*

**STUB-P4 — Add statistics to MCP**
Expose the statistics data via a `backlog_statistics` or `backlog_get_statistics` MCP tool, matching the CLI `backlog stats --json` output.
*Scope: new MCP handler, ~40 lines.*

**STUB-P5 — TUI create screens for tasks and milestones**
TUI lacks any creation workflow. Add a minimal create-task screen and optionally milestone creation.
*Scope: new `src/ui/` files, ~150 lines.*

**STUB-P6 — WebUI decision edit modal (human edit guard)**
Before saving a decision edit in WebUI, show a modal: "Are you sure you want to edit? Or supersede with diff?" — buttons: "Edit anyway" | "Supersede with diff" — diff view of changes before supersede.
*Scope: WebUI decision edit component, ~80 lines.*

---

## Version History

| Version | Date | Author | Notes |
|---|---|---|---|
| v1 | 2026-05-17 | Research pass | Initial inventory; no code changes |
| v2 | 2026-05-22 | Re-audit | Updated after BACK-489, BACK-515, BACK-516; added Diff + Version History |
| v2.1 | 2026-05-22 | Correction | Fixed MCP Demote cell (handlers exist, registered) |
| v2.2 | 2026-06-17 | Update | Added Labels section; new MCP label color tools; WebUI terminal/blocked statuses (BACK-562, BACK-563) |

---

## Diff since v1

| Cell / Row | v1 | v2 | Change |
|---|---|---|---|
| Tasks — Complete (CLI) | ⚠️ | ✅ | Added `task complete` sub-command (BACK-516) |
| Tasks — Demote (MCP) | ✅ | ✅ | v2 wrongly set to ❌ (handler is registered). Corrected in v2.1. |
| Tasks — Reorder/ordinal (CLI) | ❌ | ⚠️ | CLI has `--ordinal` in `task create` + `task edit` |
| Tasks — Reorder/ordinal (MCP) | ⚠️ | ⚠️ | MCP supports `ordinal` in `task_create` + `task_edit` input schemas |
| Drafts — Create draft (MCP) | ❌ | ⚠️ | MCP `task_create` accepts `status` field, can create drafts |
| Documents — Archive (CLI) | ❌ | ✅ | Added `doc archive` (BACK-489, BACK-516) |
| Documents — Delete (CLI) | ❌ | ✅ | Added `doc delete` (BACK-489, BACK-516) |
| Documents — Archive (MCP) | ❌ | ✅ | Added `document_archive` tool (BACK-489, BACK-516) |
| Documents — Delete (MCP) | ❌ | ✅ | Added `document_delete` tool (BACK-489, BACK-516) |
| Decisions — List (CLI) | ❌ | ✅ | Added `decision list` (BACK-515) |
| Decisions — View (CLI) | ❌ | ✅ | Added `decision view` (BACK-515) |
| Decisions — Supersede (CLI) | ❌ | ✅ | Added `decision supersede` (BACK-515) |
| Decisions — Edit (CLI) | ❌ | ⚠️ | CLI has no edit (intentional: immutable pattern) — noted as ⚠️ |
| Decisions — Edit (MCP) | ❌ | ❌ | MCP has no edit (intentional) |
| Decisions — List (MCP) | ❌ | ✅ | Added `decision_list` tool (BACK-515) |
| Decisions — View (MCP) | ❌ | ✅ | Added `decision_view` tool (BACK-515) |
| Decisions — Supersede (MCP) | ❌ | ✅ | Added `decision_supersede` tool (BACK-515) |
| Statistics & Other — Task statistics (CLI) | ❌ | ✅ | Added `backlog stats` (BACK-516) |
| Decisions — Resolve (All) | — | ❌ | New row: no "supersede to nirvana" anywhere |
| Documents — Delete (WebUI) | — | ❌ | New row: WebUI still missing delete/archive |
