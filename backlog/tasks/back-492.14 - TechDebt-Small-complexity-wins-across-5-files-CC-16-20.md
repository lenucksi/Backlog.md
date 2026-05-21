---
id: BACK-492.14
title: 'TechDebt: Small complexity wins across 5 files (CC 16-20)'
status: To Do
assignee: []
created_date: '2026-05-20 23:02'
labels:
  - tech-debt
  - refactoring
  - quick-win
dependencies: []
parent_task_id: BACK-492
priority: low
ordinal: 179700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SonarQube identifiziert 5 Dateien mit CC knapp über 15 (alle zwischen 16 und 20):
- `src/utils/backlog-directory.ts` Zeile 156 (CC 18)
- `src/web/components/DocumentationDetail.tsx` Zeile 169 (CC 16)
- `src/git/operations.ts` Zeile 557 (CC 17)
- `src/file-system/operations.ts` Zeilen 289 (CC 17), 768 (CC 16)
- `src/markdown/parser.ts` Zeile 146 (CC 18)
- `src/ui/utils/strip-tags.ts` Zeile 30 (CC 18)

Jeweils 1-2 Guards oder Extraktionen pro Datei. Low-hanging fruit — erledigt in einem Durchgang.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 backlog-directory.ts CC ≤15
- [ ] #2 strip-tags.ts CC ≤15
- [ ] #3 markdown/parser.ts CC ≤15
- [ ] #4 DocumentationDetail.tsx CC ≤15
- [ ] #5 git/operations.ts CC ≤15
- [ ] #6 bun run check . und bun test bestehen
- [ ] #7 Keine Verhaltensänderungen
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
