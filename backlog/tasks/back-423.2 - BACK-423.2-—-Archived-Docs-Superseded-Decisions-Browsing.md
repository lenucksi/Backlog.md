---
id: BACK-423.2
title: BACK-423.2 — Archived Docs + Superseded Decisions Browsing
status: Done
assignee:
  - "@opencode"
created_date: 2026-05-22 17:23
updated_date: 2026-06-08 20:23
labels:
  - web-ui
  - decisions
  - feature
  - doc
milestone: m-8
dependencies: []
references:
  - src/web/components/SideNavigation.tsx
modified_files:
  - src/file-system/operations.ts
  - src/server/handlers/documents.ts
  - src/server/router.ts
  - src/web/lib/api.ts
  - src/web/components/SideNavigation.tsx
parent_task_id: BACK-423
priority: medium
ordinal: 243000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Nach BACK-520 (archive/delete in WebUI) landen archivierte Docs in `backlog/archive/docs/` und sind unsichtbar. Superseded Decisions mischen sich in der aktiven Decision-Liste. Beide brauchen einen browsbaren Bereich in der Sidebar.

## What

### Archived Docs
- **Backend:** `GET /api/docs/archived` — listet `backlog/archive/docs/` via Core/FileSystem
- **Sidebar:** CollapsibleGroup "Archived Docs (N)" unter Decisions
- **Item:** Klickbar → Read-Only Viewer (reuse MermaidMarkdown)
- **Restore:** `POST /api/docs/:id/restore` → verschiebt zurück von archive → active

### Superseded Decisions
- **Backend:** Keine neue API — `decisions[]` Prop hat bereits alle, filter nach `status === 'superseded'`
- **Sidebar:** CollapsibleGroup "Superseded (N)" unter Decisions
- **Item:** Titel + "superseded by BACK-XXX" Link zur superseding Decision
- **Viewer:** Existierende DecisionDetail-Komponente (read-only, zeigt supersedes-Links)

## Implementation plan

1. Add `handleListArchivedDocs` + `handleRestoreDocument` in server/handlers/documents.ts
2. Register routes in server/router.ts (GET /api/docs/archived, POST /api/docs/:id/restore)
3. Add `fetchArchivedDocs()` + `restoreDoc(id)` in web/lib/api.ts
4. Add 2 CollapsibleGroup Sections in SideNavigation.tsx
5. Typecheck + lint + test

## Files
- Modify: `src/server/handlers/documents.ts`
- Modify: `src/server/router.ts`
- Modify: `src/web/lib/api.ts`
- Modify: `src/web/components/SideNavigation.tsx`
- Modify: `src/web/components/DocumentationDetail.tsx` (archived viewer context)

## Dependencies
- BACK-423.1 (CollapsibleGroup component)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 GET /api/docs/archived gibt archivierte Docs zurück (Titel, ID, Dateiname)
- [ ] #2 #2 Archived Docs Section in Sidebar aufklappbar mit Liste aller archivierten Docs
- [ ] #3 #3 Klick öffnet Read-Only View mit Restore-Button
- [ ] #4 #4 Restore funktioniert: Doc ist danach wieder in Documents Section sichtbar
- [ ] #5 #5 Superseded Decisions Section in Sidebar aufklappbar mit gefilterter Liste
- [ ] #6 #6 Superseded Decision öffnet existierende Decision-View (read-only)
- [ ] #7 #7 'superseded by' Link zeigt auf die superseding decision (klickbar)
- [ ] #8 #8 Alle Tests grün
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Archived Docs sidebar section (list, read-only viewer, restore button) with GET /api/docs/archived and POST /api/docs/:id/restore endpoints. Added Superseded Decisions sidebar section (filters from existing decisions data, shows superseded-by links). Both use CollapsibleGroup component.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->