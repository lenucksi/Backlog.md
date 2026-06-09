---
id: BACK-239
title: "Feature: Auto-link tasks to documents/decisions + backlinks"
status: Archived
assignee:
  - "@codex"
created_date: 2025-08-17 16:54
updated_date: 2026-06-09 15:58
labels:
  - web
  - enhancement
  - doc
milestone: m-9
dependencies:
  - BACK-545
references:
  - BACK-477
priority: medium
ordinal: 120000
modifiedFiles:
  - src/web/components/MermaidMarkdown.tsx
  - src/core/backlog.ts
  - src/server/router.ts
  - src/server/handlers/backlinks.ts
  - src/server/index.ts
  - src/web/lib/api.ts
  - src/web/components/DocumentationDetail.tsx
  - src/web/components/DecisionDetail.tsx
  - src/web/App.tsx
  - backlog/docs/doc-22 - Referencing-Tasks-Documents-Decisions.md
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add first-class linking between tasks and documents/decisions (from issue #271).

Goal:
- Let users reference documents/decisions directly in task content (e.g., "Documented in doc-12" or "See decision-3").
- In the web UI, references render as clickable links to the target doc/decision.
- On a document/decision page, show a "Referenced by" list of tasks that mention it (computed dynamically; no file mutation).

Scope (MVP):
- Recognize references in task body using simple, unambiguous patterns: `doc-<id>` and `decision-<id>` (optionally prefixed with `#`).
- Don't render links inside code blocks.
- No rich previews; plain links with title when available.
- Backlinks computed client-side (or server-side) by scanning tasks for references; do not write backlinks into files.

Notes:
- Extend later to support linking from docs -> tasks, and to other entities if needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Web: task detail/body renders doc-<id> and decision-<id> as links to their pages; not inside code blocks
- [x] #2 Web: document/decision pages show a Referenced by list of tasks that mention the ID
- [x] #3 Support patterns: `doc-<n>`, `decision-<n>`, with or without a leading `#` (e.g., #doc-1)
- [x] #4 Links include the target title when available; otherwise show the ID
- [x] #5 No file mutation for backlinks; computed at render time
- [ ] #6 Add short docs: how to reference docs/decisions from tasks (examples)
<!-- AC:END -->













## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Part A — Auto-Linking in Markdown (merged with BACK-545)
- Doc-/Decision-ID patterns in MermaidMarkdown.tsx
- Implemented together with BACK-545 in the same function

### Part B — Backlink API + Referenced-By Sections (after BACK-545)
1. src/core/backlog.ts: findBacklinks(entityId)
2. src/server/router.ts: GET /api/backlinks/:id
3. src/server/handlers/backlinks.ts (new)
4. src/web/lib/api.ts: fetchBacklinks(id)
5. src/web/components/DocumentationDetail.tsx: Referenced by section
6. src/web/components/DecisionDetail.tsx: Referenced by section

### Cross-Modality
- CLI: N/A (backlinks rendered in web UI)
- TUI: N/A
- WebUI: auto-links + Referenced-by sections
- MCP: N/A (phase 2 candidate)
- REST: GET /api/backlinks/:id
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Partially overlaps with BACK-477 (references should be clickable). BACK-477 covers making the existing `references:` frontmatter field render as hyperlinks — a narrower, simpler slice. Implement BACK-477 first as the foundation; this ticket's body-text link detection and backlink generation are additive on top. Scope clarification: BACK-477 = frontmatter field → clickable link. BACK-239 = body text pattern detection (doc-N, decision-N) + computed backlink lists. No duplication in the backlink direction.
<!-- SECTION:NOTES:END -->

## Implementation Notes

### Part A — Auto-Linking (merged with BACK-545)
Added doc-/decision-ID patterns to the same autoLinkEntities() regex preprocessor in MermaidMarkdown.tsx. Uses the same code-span-split mechanism. Also fixed the click handler to not intercept entity links.

### Part B — Backlink API + Referenced-By Sections
Backend: findBacklinks() in core/backlog.ts scans all tasks/docs/decisions body text for entity references using a combined regex. Server handler at GET /api/backlinks/:id returns matched results with snippets.
Frontend: fetchBacklinks() in api.ts. DocumentationDetail.tsx and DecisionDetail.tsx fetch backlinks via useEffect on mount and render a "Referenced by" section below content.

### Bonus Fixes
- App.tsx: Added missing `tasks/:id` route (white page fix)
- App.tsx: Fixed deep link `task-` prefix bug (would prepend task- to IDs, breaking task lookup)

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary

### Part A — Auto-Linking (merged with BACK-545)
- MermaidMarkdown.tsx: task IDs (BACK-123), doc IDs (doc-1), decision IDs (decision-1) auto-linked
- Skips code blocks (backtick/fenced)
- Supports # prefix: both  and  work
- Click handler updated to NOT intercept entity link navigation

### Part B — Backlink API + Referenced-By Sections
- src/core/backlog.ts: findBacklinks(entityId) scans tasks/docs/decisions for references
- src/server/router.ts: GET /api/backlinks/:id
- src/server/handlers/backlinks.ts: handler
- src/web/lib/api.ts: fetchBacklinks(id) method
- DocumentationDetail.tsx: Referenced by section below content
- DecisionDetail.tsx: Referenced by section below content

### Cross-Modality
- CLI: N/A (markdown rendering + backlinks are WebUI-specific)
- TUI: N/A
- WebUI: auto-links + Referenced-by sections
- MCP: N/A (phase 2 candidate)
- REST: GET /api/backlinks/:id
<!-- SECTION:FINAL_SUMMARY:END -->