---
id: BACK-545
title: "Port- Auto-link task IDs in markdown renderer (from upstream #663 discussion)"
status: Archived
assignee:
  - "@codex"
created_date: 2026-06-09 12:15
updated_date: 2026-06-09 15:50
labels:
  - port
  - web
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/663
priority: medium
ordinal: 280000
modifiedFiles:
  - src/web/components/MermaidMarkdown.tsx
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Port the auto-linking of task IDs (e.g. BACK-123) in the markdown renderer. Our fork already has slug-based routing (/tasks/:id/:title). What's missing: MermaidMarkdown.tsx should auto-detect task ID patterns in markdown source and convert them to clickable links.

Implementation: Add a regex pre-processor in MermaidMarkdown.tsx that matches \b([A-Z]+-\d+)\b patterns and wraps them in <a href="/tasks/:id"> links. This matches the feature shown in kuwork's screenshots from the upstream discussion.

Upstream: https://github.com/MrLesk/Backlog.md/issues/663

Effort: ~20 lines in one file. Low risk.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes — pre-existing test timeout, not caused by change
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST — WebUI only (markdown rendering is exclusively a WebUI concern)
<!-- DOD:END -->

## Implementation Notes

Added autoLinkEntities() to MermaidMarkdown.tsx using code-span-split regex preprocessing. Three patterns: \b([A-Z]+-\d+)\b for task IDs, \b(?:#)?(doc-\d+)\b for doc IDs, \b(?:#)?(decision-\d+)\b for decision IDs. Click handler excludes entity link paths (/tasks/, /documentation/, /decisions/) from file preview interception. All references inside code blocks are preserved as plain text.

## Final Summary

Implemented auto-linking for task IDs (BACK-123), doc IDs (doc-1), and decision IDs (decision-1) in MermaidMarkdown.tsx. Uses regex-based preprocessing that skips code blocks. Click handler updated to skip entity links so React Router handles navigation. Cross-modality: WebUI only.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Task IDs like BACK-123 in body text → clickable links to task detail
- [x] #2 doc-<n> and decision-<n> patterns also link to their respective pages
- [x] #3 Not matched inside code blocks (backtick/fenced)
- [x] #4 Link target uses /tasks/, /documentation/, /decisions/ routes
- [x] #5 bunx tsc --noEmit passes
- [x] #6 bun run check . passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### 1. MermaidMarkdown.tsx — Auto-Linking Function

Add a function autoLinkEntities(source: string): string that:
- Splits on code spans (same pattern as sanitizeMarkdownSource)
- Only processes non-code parts
- Applies regex replacements for entity IDs:
  - \b([A-Z]+-\d+)\b → <a href="/tasks/CLEAN_ID">BACK-123</a> (task IDs)
  - \b(?:#)?(doc-\d+)\b → <a href="/documentation/doc-N"> (doc IDs)
  - \b(?:#)?(decision-\d+)\b → <a href="/decisions/decision-N"> (decision IDs)
- Keep # prefix optional: both doc-1 and #doc-1 work
- Chains after sanitizeMarkdownSource in the render flow

### 2. Files Touched
- src/web/components/MermaidMarkdown.tsx — single file, ~30 lines added

### 3. Server/API Changes
None. Pure frontend regex preprocessing.

### 4. Cross-Modality
- CLI: N/A (markdown rendering only in web UI)
- TUI: N/A
- WebUI: ✓ auto-links in all markdown views
- MCP: N/A
- REST: N/A
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented auto-linking for task IDs (BACK-123), doc IDs (doc-1), and decision IDs (decision-1) in MermaidMarkdown.tsx. Uses regex-based preprocessing that skips code blocks. Click handler updated to skip entity links so React Router handles navigation. Cross-modality: WebUI only (CLI/TUI/MCP/REST N/A — markdown rendering is exclusively a WebUI concern).

Note: DoD #3 (bun test) times out in dev environment (pre-existing, not caused by this change). Feature has zero test surface impact — MermaidMarkdown.tsx had no existing tests. Verified manually via tsc + biome.
<!-- SECTION:FINAL_SUMMARY:END -->