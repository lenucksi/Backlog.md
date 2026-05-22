---
id: BACK-522
title: 'BACK-526 — WebUI: decision edit guard modal (edit vs supersede with diff)'
status: In Progress
assignee:
  - '@opencode'
created_date: '2026-05-22 10:25'
updated_date: '2026-05-22 15:37'
labels:
  - web-ui
  - decisions
  - ux
  - feature
milestone: m-8
dependencies: []
documentation:
  - doc-005
priority: low
ordinal: 225000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

WebUI erlaubt content-basiertes Editieren von decisions (`PUT /api/decisions/:id`), was dem ADR-artigen immutable-Pattern widerspricht. Das ist praktisch für schnelle Human-Edits, aber intransparent: Nutzer erkennen nicht, dass sie eigentlich superseden sollten.

Solution: Vor dem Speichern eines Edits ein Modal zeigen:
- „Are you sure you want to edit? Consider superseding with a diff instead."
- Button 1: „Edit anyway" (tut was es sagt)
- Button 2: „Supersede with diff" (zeigt Diff der Änderungen, erstellt supersede)

(Basiert auf DOC-005 STUB-P6)

## What

### Modal-Komponente
- Erscheint beim Klick auf „Save" nach decision-Edit im WebUI
- Inhalt:
  - Warnhinweis zum immutable pattern
  - Optional: Mini-Diff der Änderungen (old vs new content)
  - Button „Edit anyway" (schließt Modal, speichert direkt)
  - Button „Supersede with diff" (öffnet Supersede-Formular mit Prefill)

### Supersede-with-diff Flow
1. Button öffnet neues decision-create Formular
2. Prefill: title = „[old-title] (updated YYYY-MM-DD)", content = diff output
3. Nach create: automatisch supersede mit alter decision verlinken
4. Alte decision bleibt erhalten als superseded record

### Implementation
- Änderungen nur in WebUI-frontend + ggf. kleinem API-HELPER
- Core-Logik bleibt unverändert (create + supersede existiert bereits)

## Implementation plan
1. Read bestehende WebUI decision edit component
2. Build Modal-Komponente mit den beiden Buttons
3. „Edit anyway" Flow: einfach speichern wie bisher
4. „Supersede with diff" Flow: Diff berechnen + navigate zu supersede
5. Typecheck + lint

## References
- DOC-005 STUB-P6
- src/web/ — WebUI components (decision-related)
- src/server/handlers/decisions.ts — API handler
- Bestehende Modal-Komponenten suchen als UI-Pattern
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
