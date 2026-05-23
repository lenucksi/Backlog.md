---
id: BACK-530
title: 'BACK-532 — Project Health: Blocked/Deadlocked Tasks Analyse + Umsetzung'
status: To Do
assignee: []
created_date: '2026-05-22 18:42'
labels:
  - research
  - statistics
  - ux
  - dependencies
  - sequences
milestone: m-13
dependencies: []
references:
  - BACK-217
  - BACK-218
  - BACK-474
  - src/core/sequences.ts
priority: medium
ordinal: 253000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Die "Project Health" Section in Statistics hat aktuell eine "Blocked Tasks" Liste, die Dependency-basiert ist (Tasks deren Dependencies nicht terminal sind). Aber:

1. Es gibt auch status-basiertes "blocked" (via `blockedStatuses` Config, roter Punkt)
2. Deadlocks (zirkuläre Dependencies) werden gar nicht erkannt — Tasks die sich gegenseitig blockieren
3. Die Sequences-Engine (`src/core/sequences.ts`) hat bereits Zyklus-Erkennung via Kahns Algorithmus

## Was die Research schon ergeben hat

### Blocked aktuell
- `blockedStatuses` Config → roter Punkt in TUI + rote Column-Badge in WebUI
- Statistics: Dependency-basiert (`task.dependencies` mit nicht-terminalen Dependencies)
- 3-Stufen-Matching: Konfig → Hardcoded "Blocked" → Substring "blocked"
- Nur WebUI zeigt Task-Liste; CLI + MCP nur Count

### Deadlock Detection
- `src/core/sequences.ts` hat Kahns Algorithmus mit Cycle-Detection
- Zyklen werden in einen finalen "Garbage Layer" geschoben
- KEINE separate `detectDeadlocks()` Funktion
- KEINE Write-Time-Validierung

## Was zu tun ist

### Phase 1: Research abschließen (bereits teilweise erledigt)
- Genauen Code für blocked/status/deadlock dokumentieren
- Sequences-Engine API für Cycle-Detection checken

### Phase 2: UX Design
- Zwei Kategorien in Statistics:
  - **Blocked** = Task hat nicht-terminale Dependency (bestehend)
  - **Deadlocked** = Task in zirkulärer Dependency-Kette (neu)
- Wie visualisieren? (Zyklus-Pfad anzeigen: A → B → C → A)
- Soll Write-Time-Validation kommen? (Warnung beim Setzen von Dependencies)

### Phase 3: Implementierung
- `detectDeadlocks()` Funktion (Tarjan SCC oder Reuse Kahns)
- Statistics um Deadlocked-Liste erweitern
- Alle Modalitäten (CLI, TUI, WebUI, MCP)
- Optional: Dependency-Write-Guard

## References
- BACK-217 (Sequences Web UI)
- BACK-218 (Sequences Tests + Docs)
- BACK-474 (Sequences Research)
- src/core/sequences.ts
- src/core/statistics.ts
- src/utils/terminal-status.ts
- src/ui/status-icon.ts
- src/web/components/Statistics.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 Research: Aktuelle blocked-Mechanismen dokumentiert (Code + Config)
- [ ] #2 #2 Research: Topologische Deadlock-Erkennung via Sequences-Engine geprüft
- [ ] #3 #3 UX-Design: Blocked + Deadlocked Tasks Liste in Statistics festgelegt
- [ ] #4 #4 Implementierung: Blocked Tasks Liste (status-basiert) in Statistics
- [ ] #5 #5 Implementierung: Deadlocked Tasks (Zyklus-Erkennung) in Statistics
- [ ] #6 #6 Implementierung: CLI/WebUI/MCP alle zeigen Blocked+Deadlocked Daten
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
