---
id: BACK-555
title: Free-Text Substring Search Filter auf Task-Titel
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 09:39
completed_date: 2026-06-27 09:39
labels:
  - superseded
  - feature
  - cross-modality
  - ux
dependencies: []
priority: medium
ordinal: 339000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fügt einen substring-basierten Freitext-Filter auf Task-Titel hinzu, in Ergänzung zur bestehenden Fuse.js Fuzzy-Suche.

**Status Quo:** 
- Aktuelle Suche ist ausschließlich Fuse.js Fuzzy-Suche (threshold 0.35, ignoriert Position) über Titel + Beschreibung + ID + Labels + Assignees + ModifiedFiles
- WebUI hat GAR KEIN Text-Suchfeld (nur Dropdowns)
- TUI hat Fuse.js Suche über FilterHeader
- Es existiert nirgends ein substring/exact-match Filter

**Ansatz:**
- Der Substring-Filter ist separater/direkter Modus – kein Fuse.js, einfaches `title.toLowerCase().includes(input.toLowerCase())`
- In der TUI als Toggle oder separater Button
- In der WebUI als zusätzliches Text-Input
- Client-seitig ausreichend da Tasks bereits vollständig geladen werden

Referenzen: task-search.ts (Fuse.js current), filter-header.ts (TUI search input), TaskList.tsx (WebUI table – kein Suchfeld), Board.tsx (kein Suchfeld)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TUI Task List + Board: Freitext-Suche auf Titel (case-insensitive substring) – entweder als Toggle im bestehenden Search-Input (fuzzy↔title) oder als separater Filter-Button
- [ ] #2 WebUI TaskList.tsx: Text-Input für Titel-Suche, synced mit ?search= URL-Param, filtert client-seitig
- [ ] #3 WebUI Board.tsx + BoardPage.tsx: gleiches Suchfeld + URL-Param
- [ ] #4 MCP: titleContains-Feld in taskSearchSchema + Implementierung
- [ ] #5 REST (optional): titleContains-Param an /api/search
- [ ] #6 Titel-Filter ist kombinierbar mit bestehenden Filtern (Status/Priority/Labels/Milestone)
- [ ] #7 'Showing X of Y' Counter in WebUI aktualisiert sich entsprechend
- [ ] #8 Alle 5 Modalitäten sind abgedeckt (siehe Cross-Modality-Checklist)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nach erneuter Code-Analyse hat sich der Task als überflüssig erwiesen.

Kernproblem: Die Beschreibung im Task ("Es existiert nirgends ein substring/exact-match Filter") ist faktisch falsch.

Befund pro Modalität:

- **WebUI Board.tsx** (src/web/components/Board.tsx, Zeile 257-262): Bereits client-seitiger `title.toLowerCase().includes(query)` Substring-Filter implementiert – besser als der Task-Vorschlag, da bereits in Echtzeit live filtert.
- **WebUI TaskList.tsx**: Sucht über REST-API mit Fuse.js. `ignoreLocation: true, threshold: 0.35` matched faktisch jeden Substring.
- **TUI task-viewer-with-search.ts + board.ts**: Nutzen `applyTaskFilters()` / `applySharedTaskFilters()` mit dem gleichen Fuse.js-Index.
- **MCP task_search**: Selber Fuse.js-Index über `createTaskSearchIndex()`.
- **CLI task list**: Nutzt `core.queryTasks()` mit Fuse.js.

Fazit: Die bestehende Fuse.js-Suche ist bereits extrem substring-tolerant (`ignoreLocation: true` = ignoriert Position, `threshold: 0.35` = verzeiht 35% Abweichung). Ein separater "title substring only"-Modus würde keinerlei reales Defizit adressieren und nur Code-Komplexität ohne Nutzen hinzufügen.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Nicht nötig – Fuse.js + Board.tsx decken substring-Suche bereits ab. Reine Overengineering-Komplexität vermieden.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->