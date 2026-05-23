---
id: BACK-519.7
title: 'BACK-519.4 — Local file preview with syntax highlighting (PR #634)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 17:45'
labels:
  - upstream
  - feature
  - ui
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pull/634'
modified_files:
  - src/file-system/operations.ts
  - src/server/handlers/files.ts
  - src/server/router.ts
  - src/server/index.ts
  - src/web/lib/api.ts
  - src/web/components/FilePreviewModal.tsx
  - src/web/components/MermaidMarkdown.tsx
  - src/web/components/TaskDetailsModal.tsx
parent_task_id: BACK-519
priority: medium
ordinal: 230000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## What
Clicking file paths in task References/Documentation opens a preview modal with syntax-highlighted file content. PR #634 by kuwork.

## Components to port
- FilePreviewModal.tsx (171 lines) — React component with Prism syntax highlighting
- MermaidMarkdown.tsx: onFileClick prop for intercepting relative links
- New server handler GET /api/file-content (adapt to current handler pattern)
- New FileSystem.readProjectFile() with path containment security

## Implementation plan
1. Port FilePreviewModal component
2. Add onFileClick prop to MermaidMarkdown
3. Create server handler in src/server/handlers/files.ts
4. Add FileSystem.readProjectFile() in operations.ts
5. Wire through API client
6. Typecheck + lint + test
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added local file preview with syntax highlighting. FilePreviewModal component, GET /api/file-content handler, FileSystem.readProjectFile() with path containment, onFileClick prop in MermaidMarkdown, wired into TaskDetailsModal for clicking file paths in References/Documentation. Based on upstream PR #634 by kuwork.
<!-- SECTION:FINAL_SUMMARY:END -->
