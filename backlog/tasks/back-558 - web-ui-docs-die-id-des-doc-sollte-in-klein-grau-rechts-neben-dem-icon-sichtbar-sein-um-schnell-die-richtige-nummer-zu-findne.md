---
id: BACK-558
title: "web-ui docs: die id des doc sollte in klein/grau rechts neben dem icon
  sichtbar sein um schnell die richtige nummer zu findne"
status: Done
assignee: []
created_date: 2026-06-16 11:39
updated_date: 2026-06-20 19:15
labels:
  - enhancement
  - web-ui
milestone: m-8
dependencies: []
references:
  - http://localhost:6421/board/BACK-558/web-ui-docs-die-id-des-doc-sollte-in-kleingrau-rechts-neben-dem-icon-sichtbar-sein-um-schnell-die-richtige-nummer-zu-findne?q=doc
modified_files:
  - src/web/components/CollapsibleGroup.tsx
  - src/web/components/SideNavigation.tsx
priority: low
ordinal: 310000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
und evtl. will man die auch unterschiedlich sortieren können, d.h. per nummer, per last-accessed/changed und per erstellt an datum. und dann da einen kleinen auswähler für die sortierung neben das plus oben rechts bringen.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 bunx tsc --noEmit passes when TypeScript touched
- [ ] #6 bun run check . passes when formatting/linting touched
- [ ] #7 bun test (or scoped test) passes
- [ ] #8 Feature implemented in WebUI (sidebar only — other modalities N/A: CLI/TUI/MCP/REST don't render doc lists)
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Doc-ID (numerischer Teil ohne doc- Prefix) ist in jedem Docs-Sidebar-Eintrag rechts neben dem Icon in kleiner grauer Monospace-Schrift sichtbar
- [ ] #2 Sortierungs-Auswähler (#, Name, Zuletzt geändert, Erstellt) ist rechts neben dem +-Button im Documents-Header sichtbar
- [ ] #3 Standard-Sortierung ist alphabetisch nach Titel (asc) — identisch zum bisherigen Verhalten
- [ ] #4 Klick auf Select ändert Sortierung; sortedDoc-Array wird via useMemo neu berechnet
- [ ] #5 CollapsibleGroup hat neues optionales headerRightContent-Prop (kein Breaking Change für Decisions/Tasks)
- [ ] #6 TypeScript-Check (bunx tsc --noEmit) und Linting (bun run check .) passieren ohne Fehler
- [ ] #7 Bestehende Tests (bun test) laufen weiterhin grün
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Plan

### 1. CollapsibleGroup.tsx — Neues Prop headerRightContent

- Interface um `headerRightContent?: React.ReactNode` erweitern
- Im JSX zwischen Title-Zeile (linker Block) und onCreate-Button rendern:
  ```
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center space-x-3">  ← linker Block (bestehend)
      ...
    </div>
    <div class="flex items-center space-x-1">   ← NEU: rechter Block
      {headerRightContent}
      {onCreate && <button>...</button>}
    </div>
  </div>
  ```

Aktuell sind linker und rechter Teil direkt im flex-container.
Daher Umbau: linken Teil wrappen + `<div className="flex items-center space-x-1">` für right content + onCreate.

### 2. SideNavigation.tsx — Sort-State + UI

**Neue Typen** (lokal am Datei-Anfang):
- `DocSortField = "id" | "title" | "lastModified" | "createdDate"`
- `DocSortDirection = "asc" | "desc"`

**Neuer State** (ca. Zeile 50):
- `const [docSortField, setDocSortField] = useState<DocSortField>("title");`
- `const [docSortDir, setDocSortDir] = useState<DocSortDirection>("asc");`

**sortedDocs useMemo** (vor dem render der Doc-Liste):
- Switch über docSortField
- id: numerisch via parseInt(stripIdPrefix(a.id))
- title: localeCompare
- lastModified/createdDate: ISO-String-Vergleich
- Nach docSortDir ggf. negieren

**Sort-UI** (im JSX als headerRightContent):
- Minimaler `<select>` (text-xs, bg-transparent, border-none) mit Optionen:
  - "#" → sort by id
  - "Name" → sort by title
  - "Zuletzt" → sort by lastModified
  - "Erstellt" → sort by createdDate
- Kleiner Toggle-Button für asc/desc (▲/▼)

**Doc-ID im Item**:
- In der NavLink-Zeile nach dem Icon: `<span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-8 text-right shrink-0">{stripIdPrefix(doc.id)}</span>`
- `shrink-0` verhindert, dass die ID beim Truncate-Platz verliert

Keine Backend-Änderungen. Keine neuen Dateien. Keine Modalitäts-Verifikation nötig (WebUI-only Feature).
<!-- SECTION:NOTES:END -->