---
id: BACK-477
title: refences should be clickable and open something useful
status: Done
assignee:
  - "@lenucksi"
created_date: 2026-05-08 21:21
updated_date: 2026-06-20 17:15
labels: []
milestone: m-8
dependencies: []
references:
  - BACK-239
  - BACK-572
priority: low
ordinal: 169000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
references exist. it'd be nice if those could be clickable if it's a file or url in the web ui
not sure what would need to happen in the text ui
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Related to BACK-239 (Auto-link tasks to documents/decisions + backlinks). This ticket is the simpler foundation: make the `references:` frontmatter field render as a clickable hyperlink in the web UI. BACK-239 builds on top by adding body-text pattern detection and computed backlink lists. Implement this first; BACK-239 depends on it.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Superseded by BACK-572 "Add image attachment preview and clickable file references in Web UI". BACK-477 was the initial concept for making references clickable in the Web UI. BACK-572 took this further with a full specification covering image preview (FilePreviewModal with `<img>` rendering), text file preview, and wiring `onFileClick` into doc/decision views. All existing references/documentation file paths in TaskDetailsModal already work as clickable links opening FilePreviewModal — the remaining work (image detection, binary support, doc/decision wiring) is tracked in BACK-572.
<!-- SECTION:FINAL_SUMMARY:END -->