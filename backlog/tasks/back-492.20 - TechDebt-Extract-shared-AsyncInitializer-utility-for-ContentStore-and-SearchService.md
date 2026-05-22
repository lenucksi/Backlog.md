---
id: BACK-492.20
title: >-
  TechDebt: Extract shared AsyncInitializer utility for ContentStore and
  SearchService
status: Done
assignee: []
created_date: '2026-05-21 16:02'
updated_date: '2026-05-22 15:38'
labels: []
milestone: m-15
dependencies: []
modified_files:
  - src/utils/async-initializer.ts
  - src/core/content-store.ts
  - src/core/search-service.ts
parent_task_id: BACK-492
priority: low
ordinal: 202000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Both `ContentStore` and `SearchService` implement the same async double-guard lazy-init pattern independently:

```typescript
// ContentStore (src/core/content-store.ts:80-212)
async ensureInitialized() {
    if (this.initialized) return snapshot;
    if (this.initializing) return this.initializing;
    this.initializing = ...;
    ...
    this.initialized = true;
}

// SearchService (src/core/search-service.ts:125-208) — identical structure, different field types
```

If a third service adopts this pattern, the same boilerplate is copied a third time.

Implementation plan:
1. Create shared utility `src/utils/async-initializer.ts` with a generic `AsyncInitializer<T>` class:
   - Constructor takes `() => Promise<T>` — the init function
   - Single `ensure(): Promise<T>` method with double-guard pattern
   - Optional: timeout, error handling, retry logic
2. Refactor `ContentStore` to use `AsyncInitializer<Snapshot>` internally
3. Refactor `SearchService` to use `AsyncInitializer<void>` internally
4. Verify no behavior change — both services return identical results for same inputs
5. Remove duplicate `ensureInitialized` implementations
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 src/utils/async-initializer.ts created with generic AsyncInitializer class
- [ ] #2 #2 ContentStore.ensureInitialized replaced with AsyncInitializer usage
- [ ] #3 #3 SearchService.ensureInitialized replaced with AsyncInitializer usage
- [ ] #4 #4 All existing callers continue to work unchanged
- [ ] #5 #5 bun test passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
