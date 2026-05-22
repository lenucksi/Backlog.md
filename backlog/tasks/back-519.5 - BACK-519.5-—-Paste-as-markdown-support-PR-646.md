---
id: BACK-519.5
title: 'BACK-519.5 — Paste-as-markdown support (PR #646)'
status: To Do
assignee: []
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 15:12'
labels:
  - upstream
  - feature
  - ux
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/646'
parent_task_id: BACK-519
priority: medium
ordinal: 223000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Paste rich content (Word, Google Docs, web pages) into the WebUI markdown editor. Content is auto-converted to Markdown via Turndown. Images are extracted to temp storage and promoted on save.

PR #646 by kuwork. Full rewrite needed against current server architecture.

## Key pieces
- paste-as-markdown.ts: HTML cleaning + Turndown conversion (portable)
- PasteAwareMDEditor.tsx: wrapper intercepting paste events (portable)
- Image handling: temp storage, promote on save (needs rewrite)
- Server endpoints: need new handlers
- Need turndown + turndown-plugin-gfm npm deps

## Implementation plan
1. Add turndown + turndown-plugin-gfm dependencies
2. Port paste conversion logic
3. Create server handler for image upload/promote
4. Port PasteAwareMDEditor
5. Wire into TaskDetailsModal + DocumentationDetail
6. Port tests
7. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
