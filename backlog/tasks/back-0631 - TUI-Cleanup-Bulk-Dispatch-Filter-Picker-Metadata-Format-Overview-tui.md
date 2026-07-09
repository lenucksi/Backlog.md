---
id: BACK-0631
title: "TUI Cleanup: Bulk-Dispatch, Filter-Picker, Metadata-Format + Overview-tui"
status: To Do
assignee: []
created_date: 2026-07-08 16:27
labels:
  - refactoring
  - tech-debt
  - tui
milestone: m-15
dependencies: []
references:
  - doc://BACK-0629 - Phase 4 OpenTUI Migration (overview-tui Abdeckung)
priority: low
ordinal: 422000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tech-Debt-Reste nach BACK-0600 in task-viewer-with-search.ts und task-detail-content.ts, plus overview-tui Hinweis.

1. **executeBulkUpdate Strategy-Pattern** (task-viewer-with-search.ts): 7× if-else-Kette (status/priority/milestone/dueDate/labels/assignee) in eine Dispatch-Map umwandeln. Jeder Feld-Typ hat einheitliches Popup + Update-Pattern. Statt if-Kette: `const FIELD_HANDLERS: Record<string, FieldHandler>`.

2. **openFilterPicker dedup** (task-viewer-with-search.ts): 4× strukturgleiche Switch-Branches (status/priority/milestone/labels) in generischen Helper. Jeder Branch unterscheidet sich nur in popup-Titel, choices-Liste und target-Filter-Variable.

3. **Metadata-Helper** (task-detail-content.ts): 16× manuelle `{bold}Label:{/bold} ${value}`-Formatierung durch array-getriebene Metadaten-Render-Funktion ersetzen. Ein `MetadataRow[]`-Array, einmalig durchiterieren.

4. **overview-tui.ts** (454 Zeilen): Kein eigener Cleanup nötig — wird durch BACK-0629 (OpenTUI Phase 4) neu geschrieben. Nur als Referenz aufnehmen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 executeBulkUpdate 7× if → Dispatch-Map (kein Verhaltensänderung)
- [ ] #2 openFilterPicker copy-paste → generischer Helper
- [ ] #3 Metadata-Formatierung 16× → array-getriebene Render-Funktion
- [ ] #4 overview-tui als Referenz auf BACK-0629 dokumentiert
- [ ] #5 bun run check src/ui/task-*.ts --write passes
- [ ] #6 bun test --parallel passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 N/A: WebUI, MCP, REST — reiner TUI-Refactor
<!-- DOD:END -->