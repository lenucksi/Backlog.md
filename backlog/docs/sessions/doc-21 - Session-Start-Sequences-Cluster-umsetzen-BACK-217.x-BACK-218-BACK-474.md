---
id: doc-21
title: "Session Start: Sequences Cluster umsetzen (BACK-217.x, BACK-218, BACK-474)"
type: guide
created_date: 2026-06-09 12:45
tags:
  - session-start
  - sequences
  - back-217
  - back-218
  - back-474
---
# Session Start: Sequences Cluster (BACK-217.x, BACK-218, BACK-474)

## Ziel

Web UI für das Sequences-Feature fertigstellen: visuelle Darstellung von Task-Abhängigkeitsketten mit Drag-and-Drop, sowie einen Sequence-Visualizer (Gantt-ähnlich).

## Was Sequences sind

**Sequences** = dependency-basierte topologische Ordnung von Tasks. Tasks werden in parallel-ausführbare Ketten gruppiert:
- `Unsequenced`-Bucket = Tasks ohne Dependencies/Dependees/Ordinal
- Eine Sequenz = Tasks die nacheinander (seriell) gemacht werden müssen
- Tasks innerhalb einer Sequenz haben keine Interdependenzen

**Sequences != Gantt.** Sequences beantworten "was kann ich parallelisieren?" — kein Zeitbezug. Gantt (BACK-551 separat) beantwortet "wann mache ich was?" auf einer Zeitachse.

## Was bereits existiert (Core + TUI + CLI funktioniert)

- `src/core/sequences.ts` — `computeSequences()`, `Unsequenced`-Bucket, Join-Semantik
- `src/commands/sequence.ts` — CLI command
- `src/ui/sequences.ts` — TUI view
- `src/test/sequences-*.test.ts` — 7+ Testdateien
- Server: `GET /api/sequences`, `POST /api/sequences/move` (in router.ts)

## Was fehlt (zu implementieren)

| ID | Task | Status | Beschreibung |
|----|------|--------|-------------|
| **217** | Create Web UI for sequences with drag-and-drop | To Do | Haupt-Task: Sequences-Seite im Web UI |
| **217.02** | List sequences page | To Do | Seitenstruktur: Sequenzen auflisten |
| **217.03** | Move tasks and update dependencies | To Do | Drag-and-drop zwischen Sequenzen + Deps-Update |
| **217.04** | Tests | To Do | Tests für Web UI Sequences |
| **218** | Update documentation and tests | To Do | Docs + Integrationstests |
| **474** | Sequence visualizer | To Do | Visuelle Aufbereitung (Forschungslastig) |

## Task-Details

### BACK-217: Create Web UI for sequences with drag-and-drop

**Acceptance Criteria:**
- [ ] Neue `/sequences` Route in App.tsx
- [ ] SideNavigation Eintrag "Sequences"
- [ ] SequencesPage Component lädt Daten von `GET /api/sequences`
- [ ] Tasks werden in Spalten/Zeilen pro Sequenz dargestellt
- [ ] Unsequenced-Tasks werden separat gezeigt
- [ ] Drag-and-drop zwischen Sequenzen möglich
- [ ] Dependencies werden beim Verschieben aktualisiert (`POST /api/sequences/move`)
- [ ] Mobile-friendly (Touch-Drag?)

### BACK-217.02: List sequences page

**Acceptance Criteria:**
- [ ] Sequences als horizontale Swimlanes/Spalten
- [ ] Jede Sequenz zeigt Task-Chips mit ID + Titel + Status
- [ ] Unsequenced-Bucket als letzte/eigene Spalte
- [ ] Task-Count pro Sequenz
- [ ] Expand/collapse für lange Sequenzen

### BACK-217.03: Move tasks and update dependencies

**Acceptance Criteria:**
- [ ] Drag task chip aus Sequenz A nach Sequenz B
- [ ] Beim ablegen: POST /api/sequences/move mit taskId + targetSequence
- [ ] Optimistic UI update
- [ ] Error handling + Rollback bei Fehlschlag
- [ ] Visuelles Feedback (Drop-Zone highlighting)

### BACK-217.04: Tests

**Acceptance Criteria:**
- [ ] Komponententests für SequencesPage
- [ ] Drag-and-drop Tests (react-beautiful-dnd / dnd-kit)
- [ ] API-Integrationstests
- [ ] Edge cases: leere Sequenzen, alle Tasks unsequenced, einzelner Task

### BACK-218: Update documentation and tests

**Acceptance Criteria:**
- [ ] CLI-Hilfetext für sequence Befehl aktualisiert
- [ ] README.md Sequences-Abschnitt
- [ ] MCP-Tool-Dokumentation wenn nötig
- [ ] Integration tests sequences → board → task-list roundtrip

### BACK-474: Sequence visualizer (Research + Implementierung)

**Acceptance Criteria:**
- [ ] Evaluierung von Visualisierungsbibliotheken (was eignet sich für Dependency-Graphen?)
- [ ] Visuelle Darstellung: Task-Nodes + Dependency-Arrows
- [ ] Optional: Zoom/Pan, Filter nach Status/Milestone
- [ ] Integration in Sequences Page oder separater Tab

## API-Referenz

### `GET /api/sequences`

```json
{
  "unsequenced": [ /* Task[] ohne Dependencies/Dependees */ ],
  "sequences": [
    [ /* Task[] = eine Sequenz (linear) */ ],
    [ /* nächste Sequenz */ ]
  ]
}
```

### `POST /api/sequences/move`

```json
{
  "taskId": "BACK-123",
  "targetSequence": 2   // Index der Zielsequenz, oder -1 für Unsequenced
}
```

## UI-Design-Notes

- Ähnlich zu GitHub Project Boards (Spalten-Layout)
- DnD-Bibliothek: `@hello-pangea/dnd` (Fork von `react-beautiful-dnd`, maintained) oder `@dnd-kit/core`
- Sequences-Seite sollte auch auf `/gantt`-Route verlinken können (später)
- Farbliche Status-Kennung pro Task-Chip (existiert bereits in TaskCard.tsx)
- Server-Endpoints existieren bereits — reine Frontend-Arbeit

## Empfohlene Reihenfolge

1. **BACK-474 zuerst**: Research zu Visualisierung — Ergebnis bestimmt ob wir 217 als einfache Liste oder Graph bauen
2. **BACK-217**: Routes + SequencesPage + SideNav
3. **BACK-217.02**: Listen-Ansicht (Daten laden, rendern)
4. **BACK-217.03**: Drag-and-drop (DnD-Bibliothek + API-Calls)
5. **BACK-217.04**: Tests
6. **BACK-218**: Docs + Integrationstests

## Quellen

- Bestehende Implementierung: `src/core/sequences.ts`, `src/commands/sequence.ts`, `src/ui/sequences.ts`
- Server: `GET /api/sequences`, `POST /api/sequences/move` (in router.ts suchen)
- Bestehende Tests: `src/test/sequences-*.test.ts`
- Ähnliche Patterns im Fork: TaskColumn.tsx (DnD), Board.tsx (Drag-and-drop Kanban)

## Definition of Done

- [ ] `bunx tsc --noEmit` clean
- [ ] `bun run check .` clean
- [ ] `bun test` (oder scoped) bestanden
- [ ] Feature in Web UI funktionsfähig (CLI + TUI existieren bereits)
- [ ] Drag-and-drop funktioniert ohne Regression im Board