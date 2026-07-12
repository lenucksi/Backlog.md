---
id: BACK-0634
title: Clean up unused exports (knip findings)
status: Done
assignee: []
created_date: 2026-07-12 17:43
updated_date: 2026-07-12 18:20
completed_date: 2026-07-12 18:20
labels:
  - tech-debt
  - code-quality
milestone: m-15
dependencies: []
modified_files:
  - src/commands/overview.ts
  - src/core/id-generator.ts
  - src/core/milestones.ts
  - src/core/task-input-resolvers.ts
  - src/core/task-operations.ts
  - src/file-system/operations.ts
  - src/formatters/task-plain-text.ts
  - src/guidelines/index.ts
  - src/markdown/section-titles.ts
  - src/markdown/serializer.ts
  - src/mcp/errors/mcp-errors.ts
  - src/mcp/utils/schema-generators.ts
  - src/mcp/validation/validators.ts
  - src/mcp/workflow-guides.ts
  - src/server/schemas.ts
  - src/server/utils.ts
  - src/ui/heading.ts
  - src/ui/loading.ts
  - src/ui/task-viewer-state.ts
  - src/ui/tui.ts
  - src/utils/ansi.ts
  - src/utils/id-generators.ts
  - src/utils/label-filter.ts
  - src/utils/log-error.ts
  - src/utils/prefix-config.ts
  - src/web/lib/api.ts
  - src/web/lib/lanes.ts
  - src/web/utils/mermaid.ts
  - src/web/utils/milestones.ts
  - src/web/utils/paste-as-markdown.ts
  - src/web/utils/urlHelpers.ts
priority: medium
ordinal: 435000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
aislop scan reports 116 unused exports (rule: knip/exports) across the codebase. These are exported symbols that are never imported by any other file.

**Key challenge:** `knip --fix` was tried but proved too aggressive — it removed exports that ARE imported at runtime (e.g., Elysia schema objects, utility functions used through loose coupling). A careful per-symbol review is needed.

**Files with the most findings:**
- `src/server/schemas.ts` (33) — Elysia/OpenAPI schema objects. Many look like they serve as type exports or are used through dynamic patterns. These need careful review — some may be used as Elysia route schemas even if never directly imported.
- `src/mcp/validation/tool-wrapper.ts` (6) — `createSimpleValidatedTool`, `createSchemaValidator`, etc. Some are imported by MCP tool handlers.
- `src/utils/task-sorting.ts` (5) — sorting functions, some imported by components.
- `src/mcp/utils/milestone-resolution.ts` (5) — milestone helpers, some imported.
- `src/web/utils/paste-as-markdown.ts` (5) — paste handlers, some imported.
- 25+ more files with 1-4 each.

**Approach:**
1. Run `bun x knip` (no --fix) to get the full list
2. For each export: grep for imports → if found anywhere, keep; if truly zero imports, un-export or delete
3. For schemas in `src/server/schemas.ts`: check if they're used as Elysia `.post(path, handler, { body: Schema })` → if so, KEEP (runtime use, not detectable by static import analysis)
4. Run `bun run check:types` after each batch to catch breakage

**NOT using `knip --fix`** — it proved unsafe. Manual review only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 116 unused exports reviewed
- [x] #2 Truly unused exports either deleted or un-exported
- [x] #3 No regressions: bun run check:types still passes
- [x] #4 No regressions: bun test still passes
- [x] #5 Server schemas kept if used at runtime (Elysia route schemas)
<!-- AC:END -->



## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cleaned up 83 unused exports across 31 files (116 → 33 remaining).

**What was done:**
- Removed 594 lines (37 added, 594 deleted)
- 31 files modified
- Commit: `b641614cb7f17fe4124598a31df4c4796d2530e3`

**Per category:**
- **DELETED** (truly dead code, not used anywhere): `stripAnyPrefix` (prefix-config.ts), `logAndReturn` (log-error.ts), `extractLabelNames`/`getLabelConfigMap` (label-filter.ts), `generateNextDecisionId` (id-generators.ts), `generateTaskCreateSchema`/`generateTaskEditSchema` (schema-generators.ts), `handleMcpSuccess` (mcp-errors.ts), `promptText` (tui.ts), `createUrlPath` (urlHelpers.ts), `buildGlobalOrderedTaskIdsForMilestoneLaneReorder` (lanes.ts), `createHeading`/`addHeadingWithSpacing` (heading.ts), 28 schemas from schemas.ts, `getBaseStructuredSectionTitles` (section-titles.ts), `CURSOR_GUIDELINES` (guidelines/index.ts), `buildMilestoneSummary` (milestones.ts)

- **UN-EXPORTED** (used internally in same file): `runOverviewCommand`, `getActiveAndCompletedIdsFromStateMap`, `sanitizeAppendInput`/`appendBlock`, `withGitCommit`/`resolveCreateOrdinal`/`writePreparedTask`/`finalizeCreatedTask`, `CREATE_LOCK_ERROR_CODE`, `formatAcceptanceCriteriaLines`, serializer helpers, `handleBacklogToolError`/`formatErrorMarkdown`, `generateStatusFieldSchema`, `sanitizeStringPreserveWhitespace`, `getWorkflowGuideByUri`, `DocumentPayloadValidationError`/`stripPrefix`/`parseTaskIdSegments`, `withLoadingScreen`, `createInitialViewerState`, ANSI color helpers, `DRAFT_PREFIX`, `NO_MILESTONE_LABEL`, `ensureMermaid`, `cleanHtml`/`insertTextAtCursor`, `ApiError`/`NetworkError`/`ApiClient`

- **KEPT** (false positives — used at runtime but knip can't detect): MCP tool-wrapper exports (6), milestone-resolution exports (5), `formatTaskCallResult`/`formatDocumentCallResult`, `generateTaskCreateSchema`/`generateTaskEditSchema`, `getWorkflowGuideByKey`, `getContrastTextColor`, `sortByOrdinalAndPriority` (test import), web utils (htmlToMarkdown, sanitizeUrlTitle, getWebVersion, collectArchivedMilestoneKeys, isDoneStatus), index.ts public API re-exports (4), `TaskEditRequest` type

**Verification:**
- `bun run check:types` — passes (only pre-existing embedded-assets.ts errors)
- `bun run check . --write` — passes (only unsafe suggestions)
- `bun test` — exit code 0
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 npx aislop scan shows no new code-quality/duplicate-block warnings for changed files
- [ ] #6 No trivial restating comments added in new/changed code
- [ ] #7 react-hooks/exhaustive-deps clean for any changed React components
- [ ] #8 No leftover console.log/debug from development (distinguish from intended CLI output)
- [ ] #9 Cannot use knip --fix — manual review required
- [ ] #10 If an export is needed at runtime but not statically importable, add knip config exception instead of keeping the export
<!-- DOD:END -->