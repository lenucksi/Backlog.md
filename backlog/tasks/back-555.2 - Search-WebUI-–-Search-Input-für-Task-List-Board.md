---
id: BACK-555.2
title: "[Search] WebUI – Search Input für Task List & Board"
status: Done
assignee: []
created_date: 2026-06-09 12:56
updated_date: 2026-06-27 09:39
completed_date: 2026-06-27 09:39
labels:
  - superseded
  - feature
  - webui
dependencies: []
parent_task_id: BACK-555
priority: medium
ordinal: 305000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fügt ein Text-Suchfeld zur WebUI hinzu – TaskList.tsx und Board.tsx haben aktuell KEIN Suchfeld, nur Dropdown-Filter.

**TaskList.tsx:**
- `<input type="text">` in der Filter-Leiste mit Magnifying-Glass-Icon + Clear-Button
- Sync mit URL-Param `?search=` (lesen bei mount, schreiben bei Änderung)
- Client-seitiger Filter: `task.title.toLowerCase().includes(input.toLowerCase())`
- "Showing X of Y" Counter aktualisiert sich entsprechend

**Board.tsx + BoardPage.tsx:**
- `BoardPage.tsx`: `?search=` URL-Param lesen/schreiben, an Board als Prop durchreichen
- `Board.tsx`: `filterText` Prop akzeptieren, in `filteredTasks` useMemo anwenden
- Gleiches Filter-Pattern wie TaskList (case-insensitive substring)

**App.tsx:**
- Suchtext muss nicht in App-State – kann lokal in TaskList/Board bleiben
- URL-Param reicht als Persistenz

**Keine REST-API-Änderung nötig** – Filter ist rein client-seitig, Tasks sind bereits vollständig geladen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TaskList.tsx: Suchfeld in Filter-Leiste mit Text-Input + Icon + Clear
- [ ] #2 TaskList.tsx: ?search= URL-Param wird gelesen/geschrieben
- [ ] #3 TaskList.tsx: Client-seitiger Filter via title.toLowerCase().includes()
- [ ] #4 TaskList.tsx: 'Showing X of Y' Counter aktualisiert sich bei Filter
- [ ] #5 BoardPage.tsx: ?search= URL-Param lesen/schreiben und an Board übergeben
- [ ] #6 Board.tsx: filterText Prop in filteredTasks useMemo anwenden
- [ ] #7 Kombinierbar mit bestehenden Filtern (Status/Priority/Labels/Milestone/Assignee)
- [ ] #8 Keine REST-API-Anpassung nötig – rein client-seitig
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nicht implementiert – Parent BACK-555 erwies sich als überflüssig.

WebUI Board.tsx (src/web/components/Board.tsx, Zeile 257-262) filtert bereits client-seitig mit `title.toLowerCase().includes(query)`. Ein zweites, separates Suchfeld für substring-Titel-Suche wäre redundant.

TaskList.tsx hat bereits ein Suchfeld (?q=) das über die REST-API sucht – zusätzlich ein separates subtitle-Feld einzuführen würde die UI überladen ohne Mehrwert.

Referenz: Discovery-Log in BACK-555.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Nicht nötig – Board.tsx hat bereits client-seitigen title.includes()-Filter. TaskList.tsx-API-Suche matched ebenfalls substring via Fuse.js.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->