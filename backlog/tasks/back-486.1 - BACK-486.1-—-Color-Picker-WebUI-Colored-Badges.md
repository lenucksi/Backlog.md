---
id: BACK-486.1
title: BACK-486.1 — Color Picker WebUI + Colored Badges
status: Done
assignee: []
created_date: 2026-06-08 18:00
updated_date: 2026-06-08 18:23
labels:
  - labels
  - web-ui
  - color
dependencies: []
modified_files:
  - src/web/lib/api.ts
  - src/server/handlers/config.ts
  - src/web/components/Settings.tsx
  - src/web/components/ChipInput.tsx
  - src/web/components/TaskCard.tsx
  - src/web/components/TaskList.tsx
  - src/web/components/TaskDetailsModal.tsx
  - src/web/components/Board.tsx
  - src/web/components/BoardPage.tsx
  - src/web/components/TaskColumn.tsx
  - src/web/App.tsx
parent_task_id: BACK-486
priority: high
ordinal: 272000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Beschreibung

Color Picker in Settings für Labels + farbige Badges in TaskCard/ChipInput.

### Änderungen

1. **src/web/lib/api.ts** — `fetchLabels()` Return-Type fixen: `Promise<string[]>` → `Promise<LabelConfig[]>`, `addLabel()` optionalen `color`-Parameter

2. **src/server/handlers/config.ts** — `handleAddLabel` optionalen `color`-Parameter akzeptieren, LabelConfig speichern statt string

3. **src/web/components/Settings.tsx** — Color Picker pro Label: 
   - Pastell-Palette (6-8 vordefinierte Swatches) + Hex-Input
   - Farb-Swatch neben Label-Namen
   - "Add label" mit optionalem Color-Picker
   - `set-color`-Funktion pro Label

4. **src/web/components/TaskCard.tsx** — Labels als farbige Badges:
   - `backgroundColor: label.color` wenn LabelConfig
   - Fallback zu grau wenn plain string

5. **src/web/components/ChipInput.tsx** — Farb-Dots neben Vorschlägen:
   - Wenn `colorMap`-Prop gesetzt: kleiner Farbkreis neben jedem Vorschlag

6. **src/web/components/TaskDetailsModal.tsx** — Labels-Sektion mit Farben

### Datenfluss
- Settings speichert LabelConfig (name + color)
- Config-Load gibt `Array<string | LabelConfig>` zurück
- `colorMap: Record<string, string>` für ChipInput aus config.labels abgeleitet
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BACK-486.1 abgeschlossen: Color Picker in Settings (Swatches + Hex-Input), farbige Badges in TaskCard/TaskList, Farb-Dots in ChipInput, API-Typen korrigiert, colorMap-Prop durch die gesamte Komponenten-Hierarchie gereicht (App → Board/List → TaskCard).
<!-- SECTION:FINAL_SUMMARY:END -->