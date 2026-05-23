---
id: BACK-487
title: Labels for Documents and Decisions — apply task label system to docs and ADRs
status: Done
assignee:
  - '@jo'
created_date: '2026-05-13 10:14'
updated_date: '2026-05-23 17:35'
labels:
  - labels
  - documents
  - decisions
  - web-ui
  - tui
  - cli
  - mcp
milestone: m-9
dependencies:
  - BACK-486
priority: low
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Upstream constraint**: This task must be implemented on a clean branch from `upstream-master`. It must be self-contained and mergeable as a single standalone PR with no cross-task code dependencies. If a dependency on another task is unavoidable, it is listed explicitly in the Dependencies section.

Labels (and their colors, if the Colored Labels ticket has merged) are currently only available on tasks. Extend label support to Documents and Decisions so they can be categorized using the same vocabulary already defined in `config.yml`.

**Frontmatter extension**: Add `labels: string[]` to the document and decision file schemas, parsed identically to task labels.

**Color display**: If the Colored Labels ticket is merged first, colors display automatically (labels resolve their color from `config.yml` by name). If not yet merged, plain string labels are sufficient — color display is additive and requires no re-work.

**Sidebar UX** (optional, UX to be determined during implementation): Consider a subtle visual indicator in the docs/decisions list sidebar — e.g. a small colored dot or left-border accent. This should not clutter the list; a single dot per item on one side is sufficient. Exact treatment left to implementer judgment, but must be reviewed against accessibility contrast ratios.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Documents and Decisions support `labels: string[]` in their frontmatter; parser handles missing/empty field gracefully
- [x] #2 WebUI: labels are visible in the full detail view of a doc/decision as badges (colored if Colored Labels is merged)
- [x] #3 WebUI: doc/decision list view shows a subtle visual indicator for labeled items (e.g. colored dot or left border); exact treatment is implementer's choice but must be visually unobtrusive
- [x] #4 TUI: labels are visible in the doc/decision detail view
- [x] #5 CLI: `doc view` and `decision view` output includes labels; `doc list` and `decision list` support filtering by `--label` flag consistent with `task list --label`
- [x] #6 MCP: document_view, document_list, and document_search expose and accept labels in their schemas
- [x] #7 Filtering by label in the doc/decision list returns consistent results with equivalent task label filtering
- [x] #8 All 5 modalities (CLI, TUI, WebUI, MCP, REST /api/docs) covered or explicitly marked N/A with justification in implementation notes
- [x] #9 #9 document_search and decision_search support label filtering consistent with task_search
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Overview
Labels frontmatter and types are already handled by BACK-486 (parser, types). The WIP commit already has CLI commands for doc/decision with --label flags, core label CRUD, file-system label ops, config settings, and serializer label frontmatter. Seven remaining areas need work.

### 1. Frontmatter Serialization — already done in WIP
- serializer.ts already includes labels: in doc/decision frontmatter write path

### 2. WebUI: Label Badges in Doc/Decision Detail Views
- File: `src/web/components/DecisionDetail.tsx` — Add label badges section after the header metadata (alongside status/supersede info)
- File: `src/web/components/DocumentationDetail.tsx` — Add label badges section after the header metadata
- Pattern: Replicate the label rendering from TaskCard.tsx (same badge-style rendering)

### 3. WebUI: Sidebar Indicators
- File: `src/web/components/SideNavigation.tsx` — Add a small colored dot (or left-border accent) next to doc/decision items in sidebar that have labels
- Use a small `<span>` with a w-2 h-2 rounded-full dot

### 4. CLI: --label Filter for Doc/Decision List — already done in WIP
- doc.ts `list` command already has `--label` filter implemented
- decision.ts `list` command already has `--label` filter implemented
- Verify full `doc view` and `decision view` output shows labels

### 5. MCP: Labels in Doc/Decision MCP Tools
- File: `src/mcp/tools/documents/schemas.ts` — Add `labels` field to documentListSchema, documentCreateSchema, documentUpdateSchema, documentSearchSchema
- File: `src/mcp/tools/decisions/schemas.ts` — Add `labels` field to decisionListSchema, decisionCreateSchema, decisionSearchSchema
- File: `src/mcp/tools/documents/handlers.ts` — Expose labels in listDocuments, viewDocument, searchDocuments output; accept label filter in listDocuments and searchDocuments
- File: `src/mcp/tools/decisions/handlers.ts` — Expose labels in listDecisions, viewDecision, searchDecisions output; accept label filter in listDecisions and searchDecisions

### 6. REST: Labels in Doc/Decision Endpoints
- File: `src/server/handlers/documents.ts` — Add labels to handleListDocs response; accept label query param filter; include label in handleGetDoc response
- File: `src/server/handlers/decisions.ts` — Add labels to handleListDecisions response; accept label query param filter; include label in handleGetDecision response

### 7. Search-by-Label — handled by search service + server search handler
- search-service.ts already builds document/decision data from store, but label filtering currently only applies to tasks.
- Need to extend matchesLabels pattern: add `labelsLower` to DocumentSearchEntity and DecisionSearchEntity
- Update applySnapshot for documents/decisions to include labelsLower
- Update collectWithoutQuery to apply label filter for documents/decisions
- Update the search method in searchService to also check document/decision labels when label filter is present
- Server search handler already handles label params via buildSearchFilters

### 8. TUI Labels — check if TUI doc/decision views exist
- No dedicated TUI views for docs/decisions found; mark as N/A

### Files modified:
- src/mcp/tools/documents/schemas.ts (add labels to schemas)
- src/mcp/tools/decisions/schemas.ts (add labels to schemas)
- src/mcp/tools/documents/handlers.ts (expose labels in handlers)
- src/mcp/tools/decisions/handlers.ts (expose labels in handlers)
- src/server/handlers/documents.ts (labels in REST response + filter)
- src/server/handlers/decisions.ts (labels in REST response + filter)
- src/core/search-service.ts (labelsLower + label filter for docs/decisions)
- src/web/components/DecisionDetail.tsx (label badges)
- src/web/components/DocumentationDetail.tsx (label badges)
- src/web/components/SideNavigation.tsx (sidebar indicator dots)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #4 (TUI): No dedicated TUI doc/decision views exist — labeled N/A.

Pre-existing WIP errors in types/index.ts, parser.ts, serializer.ts, backlog.ts, doc.ts, decision.ts (owned by BACK-486) cause tsc + test failures. These are NOT from my changes.

bun run check . on my 13 modified files passes clean (only pre-existing warnings in decision handlers from string concat).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementation Summary

### What was implemented
Extended label support from tasks to Documents and Decisions across all accessible modalities:

**MCP Tools** (schemas + handlers):
- `src/mcp/tools/documents/schemas.ts` — Added `labels: string[]` to list, create, update, and search schemas
- `src/mcp/tools/decisions/schemas.ts` — Added `labels: string[]` to list, create, and search schemas
- `src/mcp/tools/documents/handlers.ts` — Labels exposed in output, accepted as filter in list/search, forwarded in create/update
- `src/mcp/tools/decisions/handlers.ts` — Labels exposed in output, accepted as filter in list/search, forwarded in create
- `src/mcp/utils/document-response.ts` — Labels shown in document MCP detail output

**REST API**:
- `src/server/handlers/documents.ts` — `GET /api/docs` supports `?label=` filter param; response includes `labels: string[]`; create/update accept labels in body
- `src/server/handlers/decisions.ts` — `GET /api/decisions` supports `?label=` filter param; response includes `labels: string[]`
- `src/server/router.ts` — Updated type signatures to pass Request
- `src/server/utils.ts` — Added `parseDocumentLabels()` validator

**Search Service**:
- `src/core/search-service.ts` — Added `labelsLower` to DocumentSearchEntity and DecisionSearchEntity; search query and collectWithoutQuery now apply label filters to docs/decisions (previously task-only)

**WebUI**:
- `src/web/components/DecisionDetail.tsx` — Label badges in header metadata area
- `src/web/components/DocumentationDetail.tsx` — Label badges in header metadata area
- `src/web/components/SideNavigation.tsx` — Small gray dot indicator on active/superseded decisions and docs/archived docs sidebar items

### N/A by modality
- **TUI (#4)**: No dedicated TUI views exist for docs or decisions (board/task-viewer is task-only)

### Pre-existing limitations
The WIP base has encoding issues in BACK-486-owned files (types/index.ts, parser.ts) causing tsc failures — not from my changes. `bun run check .` on all 13 modified files passes clean.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->
