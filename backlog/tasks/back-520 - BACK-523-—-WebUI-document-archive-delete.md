---
id: BACK-520
title: "BACK-523 — WebUI: document archive/delete"
status: Done
assignee:
  - "@opencode"
created_date: 2026-05-22 10:24
updated_date: 2026-06-08 20:23
labels:
  - web-ui
  - parity
  - feature
  - doc
milestone: m-8
dependencies: []
documentation:
  - doc-005
modified_files:
  - src/server/handlers/documents.ts
  - src/server/router.ts
  - src/web/lib/api.ts
  - src/web/components/DocumentationDetail.tsx
priority: medium
ordinal: 222000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

WebUI hat create, read, update für documents — aber kein archive oder delete. Documents können nur via CLI (`doc archive` / `doc delete`) oder MCP (`document_archive` / `document_delete`) gelöscht oder archiviert werden. Nutzer der WebUI können erstellte Dokumente nicht mehr loswerden.

(Basierend auf DOC-005 STUB-P3)

## What

### Backend: REST endpoints
- `DELETE /api/documents/:id` — Löschen
- `POST /api/documents/:id/archive` — Archivieren
- Oder Integration in existierende document handlers

### Frontend: UI buttons
- Archive-Button in document list view (icon/farbig)
- Archive-Button in document detail view
- Delete-Button mit Confirm-Dialog (nicht archiviert → löschen? oder archivieren?)
- Status/Archiv-Indikator in document list

### Semantik
- Archivieren: verschiebt nach backlog/archive/docs/
- Löschen: unwiderruflich, nur für archivierte Docs? Oder mit --force?
- Gleich verhalten wie CLI `doc archive` / `doc delete`

## Implementation plan
1. Read existing document handlers + API routes
2. Add REST endpoints in src/server/handlers/documents.ts + router.ts
3. Add UI buttons + confirm dialog in document components
4. Read CLI doc archive/delete for semantic reference
5. Typecheck + lint + test

## References
- DOC-005 STUB-P3
- BACK-516 (CLI doc archive/delete)
- BACK-489 (Archive documents)
- src/server/handlers/documents.ts — bestehende handler
- src/commands/document.ts — CLI commands for semantics
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added REST endpoints (DELETE /api/docs/:id, POST /api/docs/:id/archive) and WebUI Archive/Delete buttons in DocumentationDetail.tsx with confirmation modal. Follows CLI doc archive/delete semantics (BACK-516).
<!-- SECTION:FINAL_SUMMARY:END -->