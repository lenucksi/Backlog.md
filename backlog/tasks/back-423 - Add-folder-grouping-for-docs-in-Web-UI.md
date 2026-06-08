---
id: BACK-423
title: Folder groupings & archived-content browser in WebUI
status: Done
assignee:
  - "@alex-agent"
created_date: 2026-04-25 12:14
updated_date: 2026-06-08 20:23
labels:
  - web-ui
  - enhancement
  - doc
milestone: m-8
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/488
priority: medium
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Drei zusammenhängende Probleme:

1. **Folders/Superseded/Archived sind unsichtbar** — docs nach archive weg, superseded decisions in der Liste vermischt mit aktiven, completed tasks verschwinden aus der Board-Ansicht
2. **Kein konsistenter UI-Mechanismus** für "versteckte Items wieder sichtbar machen"
3. **BACK-423** war ursprünglich nur Folder-Grouping für Docs — mit dem gleichen Pattern lassen sich auch archivierte Items browsbar machen

**Lösung:** `CollapsibleGroup` als wiederverwendbare Sidebar-Komponente extrahieren, damit 3 neue Sections bauen.

## Subtasks

| Sub | Beschreibung | Aufwand |
|-----|-------------|---------|
| .1 | CollapsibleGroup Shared Component extrahieren + Docs/Decisions refactor | ~2h |
| .2 | Archived Docs + Superseded Decisions Browsing | ~3h |
| .3 | Completed Tasks Section in Sidebar | ~2h |

## Shared Code Pattern

```
SideNavigation.tsx
├── <CollapsibleGroup>           ← shared component (neu)
│   ├── title + icon + count
│   ├── collapse toggle (localStorage)
│   ├── create button (optional)
│   └── empty state
├── Documents  (uses CollapsibleGroup)    ← refactor existing
├── Decisions  (uses CollapsibleGroup)    ← refactor existing
├── Archived Docs (uses CollapsibleGroup) ← neu (.2)
├── Superseded Decisions (uses CollapsibleGroup) ← neu (.2)
└── Completed Tasks (uses CollapsibleGroup) ← neu (.3)
```

## References
- https://github.com/MrLesk/Backlog.md/issues/488
- src/web/components/SideNavigation.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 CollapsibleGroup Komponente extrahiert, Docs/Decisions refactored (.1)
- [x] #2 #2 Archived Docs Section + Superseded Decisions Section browsbar (.2)
- [x] #3 #3 Completed Tasks Section browsbar (.3)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
3 Subtasks abgeschlossen: CollapsibleGroup Komponente extrahiert (+ Docs/Decisions refactored), Archived Docs + Superseded Decisions Sections in Sidebar, Completed Tasks Section in Sidebar. 423.1 + 423.2 + 423.3 fertig.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->