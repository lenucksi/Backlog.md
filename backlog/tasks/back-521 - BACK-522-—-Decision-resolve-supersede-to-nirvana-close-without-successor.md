---
id: BACK-521
title: 'BACK-522 — Decision resolve: supersede to nirvana (close without successor)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 16:48'
labels:
  - decisions
  - feature
  - cli
  - mcp
  - web-ui
milestone: m-13
dependencies: []
documentation:
  - doc-005
modified_files:
  - src/core/backlog.ts
  - src/commands/decision.ts
  - src/mcp/tools/decisions/schemas.ts
  - src/mcp/tools/decisions/handlers.ts
  - src/mcp/tools/decisions/index.ts
  - src/server/handlers/decisions.ts
  - src/server/router.ts
  - src/web/lib/api.ts
  - src/web/components/DecisionDetail.tsx
priority: medium
ordinal: 224000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Der decision lifecycle hat einen fehlenden Endzustand: eine decision kann nur aktiv (accepted) oder durch supersede abgelöst sein. Es gibt keinen Weg, eine decision als erledigt/abgeschlossen zu markieren OHNE einen Nachfolger zu erzeugen.

`decision supersede` erfordert eine neue decision mit `status: accepted` + `supersedes: <old-id>`. Das alte bekommt `status: superseded`. Es gibt keine Möglichkeit, eine decision einfach als erledigt zu schließen.

(Basierend auf DOC-005 STUB-P2, modifiziert: kein edit, stattdessen resolve)

## What

Neuer status `resolved` (oder `closed`) für decisions:
- Eine resolved decision hat KEINEN supersedes/supersededBy link
- Sie ist einfach „erledigt ohne Nachfolger"
- Unterschied zu `superseded`: keine Beziehung zu einer anderen decision

### CLI: `backlog decision resolve <id>`
- Setzt status=resolved
- Optional: `--reason <text>` für Abschlussnotiz als Notes-Eintrag

### MCP: `decision_resolve` tool
- Input: `{ id: string, reason?: string }`
- Folgt dem bestehenden decision MCP-Pattern

### WebUI: Resolve-Button + supersede-guard Modal
- Button „Resolve" in decision detail view
- Im Entscheidungs-Edit-Modal: Option „Als erledigt markieren ohne Nachfolger"

## Implementation plan
1. Status-Resolve zum Decision-Type hinzufügen falls nötig
2. Core resolveDecision() Methode in backlog.ts
3. CLI `decision resolve <id>` command
4. MCP `decision_resolve` tool (schemas + handler + registration)
5. WebUI Resolve-Button + Integration in Edit-Guard
6. Typecheck + lint + test

## References
- DOC-005 STUB-P2
- BACK-515 (Bestehende decisions parity: list/view/supersede)
- src/core/backlog.ts — bestehende decision-Methoden suchen
- src/mcp/tools/decisions/ — bestehende MCP decision tools als Pattern
- src/commands/decision.ts — CLI decision commands als Pattern
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented decision resolve (supersede-to-nirvana) across all modalities: core.resolveDecision() in backlog.ts, CLI `decision resolve <id>`, MCP decision_resolve tool, WebUI resolve button with confirmation modal. Completes the decision lifecycle: create → supersede → resolve.
<!-- SECTION:FINAL_SUMMARY:END -->
