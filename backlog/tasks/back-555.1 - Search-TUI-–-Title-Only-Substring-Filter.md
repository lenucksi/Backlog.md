---
id: BACK-555.1
title: "[Search] TUI – Title-Only Substring Filter"
status: Done
assignee: []
created_date: 2026-06-09 12:55
updated_date: 2026-06-27 09:39
completed_date: 2026-06-27 09:39
labels:
  - superseded
  - feature
  - tui
dependencies: []
parent_task_id: BACK-555
priority: medium
ordinal: 304000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fügt einen Title-Only Substring Filter in die TUI hinzu.

**src/utils/task-search.ts:**
- `TaskSearchOptions` um `titleSubstring?: string` erweitern
- In `search()` oder als separaten Filter-Pass nach dem Fuse.js-Ergebnis: `tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))`
- Der Substring-Filter ist ein separater/direkter Modus, kein Fuse.js

**src/ui/components/filter-header.ts:**
- `FilterState` um `searchMode: "fuzzy" | "title"` erweitern (default: "fuzzy")
- Toggle-Mechanismus im Search-Input (z.B. `Ctrl+T` oder separater Button)
- Placeholder-Text ändert sich je nach Modus: `"Search (fuzzy)..."` vs `"Search (title)..."`

**src/ui/task-viewer-with-search.ts:**
- `applyFilters()` erweitern: wenn `searchMode === "title"`, `titleSubstring` statt Fuse.js query nutzen
- Oder: `applyTaskFilters()` um `titleSubstring` Parameter erweitern

**src/ui/board.ts:**
- `getFilteredTasks()` und `onFilterChange` entsprechend erweitern

Der Substring-Filter ist kombinierbar mit allen anderen Filtern (Status, Priority, Labels, Milestone).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 FilterState in filter-header.ts hat searchMode: 'fuzzy' | 'title' mit Toggle (Ctrl+T oder Button)
- [ ] #2 Search-Input Placeholder zeigt aktuellen Modus an
- [ ] #3 task-search.ts: titleSubstring-Option in filter/applyTaskFilters
- [ ] #4 task-viewer-with-search.ts: titleSubstring wird in applyFilters() berücksichtigt
- [ ] #5 board.ts: titleSubstring wird in getFilteredTasks() berücksichtigt
- [ ] #6 Kombinierbar mit Status/Priority/Labels/Milestone-Filtern
- [ ] #7 Substring ist case-insensitive und einfaches title.includes() – kein Fuse.js für diesen Modus
- [ ] #8 Beim Wechsel von title→fuzzy wird der Suchtext als Fuse.js-query verwendet
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Nicht implementiert – Parent BACK-555 erwies sich als überflüssig.

TUI hat bereits einen voll funktionsfähigen Fuse.js-Search-Input (filter-header.ts + task-viewer-with-search.ts applyFilters()). Fuse.js mit `ignoreLocation: true` matched bereits jeden Substring auf Titel. Ein zusätzlicher `searchMode: "fuzzy" | "title"`-Toggle hätte keine spürbare Verbesserung für den User gebracht, nur mehr State und Keybindings.

Referenz: Discovery-Log in BACK-555.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Nicht nötig – Fuse.js-Suche matched bereits jeden Titel-Substring. searchMode-Toggle wäre pure Komplexität.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->