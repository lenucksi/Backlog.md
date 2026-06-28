---
id: BACK-561
title: "web ui: kein decision new möglichkeit, nur resolve"
status: To Do
assignee:
  - "@jo"
created_date: 2026-06-17 07:28
updated_date: 2026-06-20 17:30
labels:
  - web-ui
  - decisions
milestone: m-8
dependencies: []
references:
  - https://github.com/user-attachments/assets/decisions-ui-reference
    (placeholder)
modified_files:
  - src/web/components/SideNavigation.tsx
priority: medium
ordinal: 313000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In der Web UI kann man Decisions nur resolven (resolve-to-nirvana), aber nicht neu anlegen. Der "New Decision" Button fehlt in der Sidebar-Navigation.

**Status:**
- Decision-Erstellung via Route `/decisions/new` funktioniert bereits (`DecisionDetail.tsx` → `handleSave` → `apiClient.createDecision()`)
- REST `POST /api/decisions` existiert
- CLI `decision create` existiert
- MCP `decision_create` existiert
- **Fehlt nur:** Der `onCreate`-Handler für das Decisions-`CollapsibleGroup` in `SideNavigation.tsx`

**Vergleich mit Documents:**
- Documents `CollapsibleGroup` hat `onCreate={handleCreateDocument}` → navigiert zu `/documentation/new`
- Decisions `CollapsibleGroup` (Zeile 632-697) hat **kein** `onCreate`-Prop

**Fix:**
1. `handleCreateDecision` Callback in SideNavigation.tsx hinzufügen → `navigate('/decisions/new')`
2. `onCreate={handleCreateDecision}` an Decisions `CollapsibleGroup` übergeben

Das ist ein 10-Zeilen-Fix in einer Datei.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SideNavigation zeigt "New Decision" Button im Decisions-CollapsibleGroup
- [ ] #2 Klick auf "New Decision" navigiert zu `/decisions/new`
- [ ] #3 Neue Decision kann erstellt und gespeichert werden
- [ ] #4 Nach Erstellung erscheint die neue Decision in der Sidebar-Liste
- [ ] #5 `bunx tsc --noEmit` passes
- [ ] #6 `bun run check .` passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Step 1: Add `handleCreateDecision` callback
In `src/web/components/SideNavigation.tsx`, nach `handleCreateDocument` (Zeile 199):
```tsx
const handleCreateDecision = useCallback(() => {
    navigate('/decisions/new');
}, [navigate]);
```

### Step 2: Pass `onCreate` to Decisions CollapsibleGroup
In Zeile 632-697, beim `<CollapsibleGroup title="Decisions" ...>`:
`onCreate={handleCreateDecision}` hinzufügen.

### Step 3: Tests
- Manuell: Web UI starten, auf "New Decision" in Sidebar klicken, Decision erstellen
- Prüfen: neue Decision erscheint in der Liste
- Prüfen: "New Decision" Button ist nicht sichtbar wenn Sidebar collapsed ist
<!-- SECTION:PLAN:END -->