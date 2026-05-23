---
id: BACK-488
title: >-
  Label Management — central CRUD and autocomplete for labels across all input
  surfaces
status: Done
assignee: []
created_date: '2026-05-13 10:14'
updated_date: '2026-05-23 17:35'
labels:
  - labels
  - ux
  - web-ui
  - tui
  - cli
  - mcp
  - autocomplete
milestone: m-9
dependencies:
  - BACK-486
modified_files:
  - src/commands/label.ts
  - src/cli.ts
  - src/ui/components/label-manager.ts
  - src/web/components/Settings.tsx
  - src/web/components/ChipInput.tsx
  - src/web/components/LabelFilterDropdown.tsx
  - src/web/components/TaskCard.tsx
  - src/web/components/TaskDetailsModal.tsx
  - src/web/components/TaskList.tsx
  - src/web/components/TaskColumn.tsx
  - src/web/lib/api.ts
  - src/mcp/tools/labels/
  - src/server/handlers/config.ts
  - src/core/backlog.ts
  - src/file-system/operations.ts
  - src/markdown/parser.ts
  - src/markdown/serializer.ts
  - src/commands/config.ts
priority: medium
ordinal: 175000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Upstream constraint**: This task must be implemented on a clean branch from `upstream-master`. It must be self-contained and mergeable as a single standalone PR with no cross-task code dependencies. If a dependency on another task is unavoidable, it is listed explicitly in the Dependencies section.

Labels can be arbitrary strings today, causing label sprawl (typos, near-duplicates). Fix this with two complementary changes:

**1. Central label CRUD**: Make `config.yml` `labels` the single source of truth for the known label vocabulary. Provide full CRUD management through all access surfaces.

**2. Autocomplete/typeahead**: All label input fields (task create/edit, doc create/edit, decision create/edit) show suggestions from the `config.yml` label list as the user types.

**Schema coordination**: This ticket may land before or after the Colored Labels ticket. If colors land first, the CRUD UI must include a color field. If this lands first, the color field is added by the colors ticket — no breaking change (both use the same `{name, color?}` shape from `config.yml`).

**Migration (one-time, on first use)**: Harvest all distinct label strings from existing task, doc, and decision frontmatter and add them to `config.yml` labels list. Run automatically on `backlog init` or the first CRUD operation if labels are not yet in config.

**Assignee autocomplete is NOT in scope** — that is handled separately in BACK-484 using a scraping approach (no config entry).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WebUI Settings: dedicated Labels management section — list all labels, add new, rename, delete; shows color swatch if Colored Labels ticket is merged (gracefully omits color column if not)
- [x] #2 TUI: label management accessible from settings panel (list, add, rename, delete)
- [x] #3 CLI: commands to manage labels — e.g. `backlog label list`, `backlog label add <name>`, `backlog label rename <old> <new>`, `backlog label remove <name>` (or equivalent as `config` subcommands)
- [x] #4 MCP: tools or config tool extensions to list, add, rename, and delete labels from config.yml
- [x] #5 REST: CRUD endpoints for labels exposed (e.g. GET/POST/PUT/DELETE /api/config/labels or similar)
- [x] #6 Autocomplete: all label input fields in WebUI/TUI show typeahead suggestions from config.yml after 1+ characters; matching is case-insensitive
- [x] #7 Autocomplete: user can still enter a label not in the managed list; UI shows a prompt ('Label not in managed list — add it?') rather than blocking
- [x] #8 CLI: at minimum, label input validation warns on submit if the value is not in the managed list; interactive prompt offers suggestions where feasible
- [x] #9 One-time migration: on first use (or `backlog init`), all distinct labels found in existing task/doc/decision frontmatter are added to config.yml labels list
- [x] #10 All 5 modalities (CLI, TUI, WebUI, MCP, REST) covered or explicitly marked N/A with justification in implementation notes
- [x] #11 Remove `config set labels` blocker: after this ticket, the canonical path is `backlog label add/remove`. The existing `config set labels` error message is replaced to redirect users to `backlog label`.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

### CLI Label Commands
- `src/commands/label.ts` — `backlog label list`, `backlog label add <name>`, `backlog label rename <old> <new>`, `backlog label remove <name>`; validation warns on non-managed labels
- `src/cli.ts` — Registered `registerLabelCommand`

### TUI Label Manager
- `src/ui/components/label-manager.ts` — Full CRUD accessible from settings panel

### WebUI Label Management
- `src/web/components/Settings.tsx` — Labels section with list, add, rename, delete
- `src/web/components/ChipInput.tsx` — Autocomplete/typeahead component; case-insensitive matching after 1+ chars; allows free entry with prompt
- `src/web/components/LabelFilterDropdown.tsx` — Filter dropdown with label autocomplete
- `src/web/components/TaskCard.tsx`, `TaskDetailsModal.tsx`, `TaskList.tsx`, `TaskColumn.tsx` — Integrated ChipInput for label editing
- `src/web/lib/api.ts` — API functions for label CRUD

### MCP Label Tools
- `src/mcp/tools/labels/` — list/add/rename/delete tools with schemas

### REST Label Endpoints
- `src/server/handlers/config.ts` — GET/POST/PUT/DELETE `/api/config/labels` CRUD handlers

### Backend
- `src/core/backlog.ts` — `addLabel`, `renameLabel`, `removeLabel` core methods
- `src/file-system/operations.ts` — Load/save label config
- `src/markdown/parser.ts` — Label parsing
- `src/markdown/serializer.ts` — Label serialization

### Migration
- One-time migration on first `backlog label` CRUD operation or opening WebUI Labels settings; harvests distinct labels from task/doc/decision frontmatter into `config.yml`

### Config Validation
- `src/commands/config.ts` — `config set labels` now redirects to `backlog label` commands
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Final Summary

Implemented centralized label CRUD and autocomplete across all 5 access modalities:

- **CLI**: `backlog label list/add/rename/remove` commands with validation
- **TUI**: Label manager component in settings panel
- **WebUI**: ChipInput autocomplete component used across TaskCard, TaskDetailsModal, TaskList, TaskColumn; Settings labels section with full CRUD
- **MCP**: Label list/add/rename/delete tools
- **REST**: Full CRUD endpoints at `/api/config/labels`
- **Migration**: Auto-harvests existing labels from task/doc/decision frontmatter on first CRUD operation
- **Validation**: CLI warns on non-managed labels; WebUI prompts to add unknown labels
- **Config UX**: `config set labels` redirects users to `backlog label` commands

95 files changed, 3888 insertions, merged into main as part of integration/labels-and-subtasks.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->
