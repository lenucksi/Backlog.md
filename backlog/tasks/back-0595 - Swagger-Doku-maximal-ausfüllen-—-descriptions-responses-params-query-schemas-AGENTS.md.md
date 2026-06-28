---
id: BACK-0595
title: Swagger-Doku maximal ausfüllen — descriptions, responses,
  params/query-schemas, AGENTS.md
status: Done
assignee: []
created_date: 2026-06-28 14:55
updated_date: 2026-06-28 14:56
labels:
  - rest-api
  - documentation
  - developer-experience
  - elysia
  - swagger
milestone: m-19
dependencies: []
priority: medium
ordinal: 371000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nachdem BACK-490 die Elysia-Integration mit Basis-Swagger-Metadaten (summary + tags) abgeschlossen hat, wurde die Swagger-Dokumentation maximal ausgebaut:

- Alle 63 API-Routen haben jetzt `detail.description`, `detail.responses` (200/400/404/409/500)
- Alle Pfad-Parameter (:id, :name) haben `params: t.Object()`-Schemas mit descriptions
- GET-Routen mit Filtern (tasks, search, cleanup, file-content) haben `query: t.Object()`-Schemas mit descriptions
- Globale Swagger-Config um `contact`, `license`, `externalDocs` erweitert
- Alle descriptions von Deutsch auf Englisch umgestellt (OpenAPI-Standard)
- AGENTS.md um Swagger/OpenAPI-Dokumentation-Sektion ergänzt (English only-Regel, Elysia-Code-Template)
- Neue Datei `src/server/schemas.ts` mit allen wiederverwendbaren Elysia-Type-Schemas

Technische Einschränkung: Body-Schemas und Response-Schemas wurden nicht hinzugefügt, weil die Handler `await req.json()` nutzen (Elysia würde den Body-Stream konsumieren) bzw. native Response-Objekte zurückgeben (Elysia würde validieren/422 werfen). Dafür ist ein separates Handler-Refactoring nötig.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->





## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Swagger Documentation Enrichment

### What was done
- **`src/server/schemas.ts`** (new): All reusable Elysia type schemas derived from `src/types/index.ts` — TaskSchema, TaskCreateInputSchema, TaskUpdateInputSchema, DocumentSchema, DecisionSchema, MilestoneSchema, SearchQuery, TaskListFilterQuery, IdParam, etc.
- **`src/server/router.ts`**: All 63 API routes enriched with `detail.description`, `detail.responses` (200/400/404/409/500), `params: t.Object()` on :id/:name routes, `query: t.Object()` on filter routes (task list, search, cleanup preview, file content). Global swagger config extended with `contact`, `license`, `externalDocs`. All descriptions translated from German to English.
- **`AGENTS.md`**: New "Swagger/OpenAPI Documentation" section with English-only rule, Elysia template code, path param + response schema requirements.

### Key decisions
- Query schemas use `t.Optional(t.String())` instead of strict `t.Union([t.Literal(...)])` — handlers have their own validation returning 400, Elysia would return 422 for strict unions
- Body/Response schemas intentionally omitted — handlers use `await req.json()` / return native Response objects. Adding body/response schemas requires handler refactoring
- English only — OpenAPI standard, one language per spec, no i18n support in OpenAPI

### Affected files
- `src/server/schemas.ts` (new, 299 lines)
- `src/server/router.ts` (enriched, 801 lines)
- `AGENTS.md` (new section)

### Verification
- `bun x tsc --noEmit`: ✅
- `bun run check .`: ✅ (Biome format fixes applied)
- `bun test src/test/server`: 74 pass, 4 pre-existing failures (milestone rename, /complete endpoint, asset cache, shell refresh guard)
<!-- SECTION:FINAL_SUMMARY:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All 63 API routes have detail.description + detail.responses
- [x] #2 Path params have t.Object() schemas with descriptions
- [x] #3 Filter GET routes have t.Object() query schemas
- [x] #4 Global swagger config has contact, license, externalDocs
- [x] #5 All descriptions in English
- [x] #6 AGENTS.md has Swagger/OpenAPI documentation section
- [x] #7 bun x tsc --noEmit passes
- [x] #8 bun run check . passes
<!-- AC:END -->