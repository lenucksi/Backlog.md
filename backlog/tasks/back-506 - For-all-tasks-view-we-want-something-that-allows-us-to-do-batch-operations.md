---
id: BACK-506
title: For all tasks view we want something that allows us to do batch operations
status: Done
assignee:
  - "@lenucksi"
created_date: 2026-05-17 20:09
updated_date: 2026-06-27 15:06
completed_date: 2026-06-27 15:06
labels: []
milestone: m-8
dependencies: []
references:
  - BACK-554
priority: medium
ordinal: 190000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Batchable should be at least:
- labels
- priorities
- assignees
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Superseded by BACK-554 (Bulk Operations Feature) which provides the structured implementation across all modalities.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BACK-506's intent (batch operations on tasks) is fully fulfilled by BACK-554 Bulk Operations and its subtickets (REST, TUI, WebUI). The extra items (due date, clear-X buttons) were added beyond scope during implementation.
<!-- SECTION:FINAL_SUMMARY:END -->