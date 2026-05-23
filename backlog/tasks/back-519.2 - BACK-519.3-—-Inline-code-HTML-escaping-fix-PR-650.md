---
id: BACK-519.2
title: 'BACK-519.3 — Inline-code HTML escaping fix (PR #650)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 16:31'
labels:
  - upstream
  - fix
  - ui
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/650'
modified_files:
  - src/web/components/MermaidMarkdown.tsx
parent_task_id: BACK-519
priority: low
ordinal: 219000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Fix `<` characters inside inline code spans being incorrectly escaped to `&lt;` in the markdown renderer.

## Code change
In `src/web/components/MermaidMarkdown.tsx`, modify `sanitizeMarkdownSource()` to skip `<` escaping within code spans (```...``` and `...`).

## Implementation plan
1. Extract the inline-code detection logic from PR #650 (ignore the other 23 files, which are shared task bloat)
2. Apply the sanitizer fix to MermaidMarkdown.tsx
3. Manual verification
4. Typecheck + lint
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Modified sanitizeMarkdownSource() in MermaidMarkdown.tsx to skip `<` escaping inside inline code spans (backtick-delimited). Split escaping logic to preserve `<>` in code spans while still escaping in regular markdown. Extracted from upstream PR #650 by kuwork.
<!-- SECTION:FINAL_SUMMARY:END -->
