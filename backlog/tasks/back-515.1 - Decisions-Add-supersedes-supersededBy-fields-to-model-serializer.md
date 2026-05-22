---
id: BACK-515.1
title: 'Decisions: Add supersedes/supersededBy fields to model + serializer'
status: Done
assignee: []
created_date: '2026-05-21 16:03'
updated_date: '2026-05-22 01:28'
labels:
  - decisions
  - model
  - serialization
dependencies: []
modified_files:
  - src/types/index.ts
  - src/markdown/serializer.ts
parent_task_id: BACK-515
priority: medium
ordinal: 207000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Decision type already has `status: "superseded"` but no linking fields. 

Implementation plan:
1. Extend `Decision` interface in `src/types/index.ts`:
   - `supersedes?: string` — ID of the decision this one supersedes (e.g. `"decision-42"`)
   - `supersededBy?: string` — ID of the decision that supersedes this one
2. Update `src/markdown/serializer.ts`:
   - `serializeDecision()` — write `supersedes`/`supersededBy` to frontmatter if present
   - `deserializeDecision()` — parse `supersedes`/`supersededBy` from frontmatter
3. Update `src/markdown/parser.ts` if it touches decisions
4. Handle backward compat: old decisions without these fields → undefined (not error)
5. Tests for serialize/deserialize round-trip with supersede fields

Note: No user-facing commands yet — just the data model. This is the foundation for subtasks .02-.04.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Decision type has supersedes and supersededBy optional fields
- [ ] #2 #2 Frontmatter serialization writes both fields when present
- [ ] #3 #3 Frontmatter parsing reads both fields
- [ ] #4 #4 Old decisions without these fields parse without error
- [ ] #5 #5 serialize/deserialize round-trip test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
