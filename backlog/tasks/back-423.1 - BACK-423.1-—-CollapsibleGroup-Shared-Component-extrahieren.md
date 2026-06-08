---
id: BACK-423.1
title: BACK-423.1 — CollapsibleGroup Shared Component extrahieren
status: Done
assignee:
  - "@opencode"
created_date: 2026-05-22 17:23
updated_date: 2026-06-08 20:22
labels:
  - web-ui
  - ux
  - refactoring
milestone: m-8
dependencies: []
modified_files:
  - src/web/components/CollapsibleGroup.tsx
  - src/web/components/SideNavigation.tsx
parent_task_id: BACK-423
priority: medium
ordinal: 242000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Das bestehende "collapsible section" Pattern in SideNavigation.tsx ist 2x dupliziert (Documents + Decisions) und wird für 3 weitere Sections (Archived Docs, Superseded Decisions, Completed Tasks) gebraucht.

## What

Extrahiere das Pattern in eine wiederverwendbare `CollapsibleGroup` Komponente.

Aktuell duplizierter Code pro Section:
- `isDocsCollapsed` / `isDecisionsCollapsed` state + localStorage
- Chevron-Toggle mit Icons.ChevronRight / Icons.ChevronDown
- Counter-Anzeige "Documents (5)" / "Decisions (3)"
- Create-Button (Documents: visible, Decisions: hidden)
- Empty-State "No documents" / "No decisions"
- Divider zwischen Sections

**Neue Komponente:**
`src/web/components/CollapsibleGroup.tsx`

```tsx
interface CollapsibleGroupProps {
  title: string
  icon: ReactNode
  count: number
  storageKey: string
  onCreate?: () => void
  children: ReactNode
  defaultCollapsed?: boolean
}
```

## Implementation plan

1. Create `src/web/components/CollapsibleGroup.tsx` (~60 lines)
2. Refactor SideNavigation.tsx — ersetze Documents und Decisions Sections durch CollapsibleGroup
3. Test: gleiches visuelles Verhalten, localStorage-Keys bleiben kompatibel
4. `bunx tsc --noEmit`
5. `bun run check .`
6. `bun test --timeout=10000`

## Files
- Neu: `src/web/components/CollapsibleGroup.tsx`
- Modify: `src/web/components/SideNavigation.tsx`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 CollapsibleGroup Komponente existiert mit Chevron-Toggle, localStorage-Persistence, Counter, optionalem Create-Button
- [ ] #2 #2 Bestehende Documents Section verwendet CollapsibleGroup — gleiches Verhalten
- [ ] #3 #3 Bestehende Decisions Section verwendet CollapsibleGroup — gleiches Verhalten
- [ ] #4 #4 Auto-Collapse bei >6 Items wie bisher
- [ ] #5 #5 Keine visuellen Änderungen für existierende Sections
- [ ] #6 #6 Alle Tests grün
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted duplicated collapsible section pattern from SideNavigation.tsx into reusable CollapsibleGroup component. Refactored Documents and Decisions sections to use it. localStorage keys preserved for backward compatibility.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->