---
id: decision-0002
title: "Vereinheitlichung Task-Archivierung: task_complete abschaffen,
  archiveTask als einzige Operation"
date: 2026-06-27 17:56
status: accepted
---
## Context

## Ausgangslage

Im Backlog.md MCP existierten zwei scheinbar separate Operationen für das Entfernen von Tasks aus dem aktiven Board:
- `task_archive` — für "nicht-fertige" Tasks (cancelled, duplicate, invalid)
- `task_complete` — für "fertige" Tasks (Done → in completed folder verschieben)

Beide Operationen bewegten Dateien in denselben Zielordner (`backlog/archive/tasks/`) mit minimalen Unterschieden im Frontmatter-Stamp. Ein systematischer Review des gesamten MCP-Tool-Sets (Mai 2026) deckte mehrere Probleme auf.

## Befunde aus dem MCP-Review

### 1. Naming vs. Behavior: `task_complete` tut nicht, was der Name sagt
- `task_complete` suggerierte "Task auf Done/terminalen Status setzen"
- Tatsächlich machte es nur einen File-Move (`tasks/` → `archive/tasks/`) + setzte `status: "Archived"`
- Um einen Task auf Done zu setzen, war immer `task_edit(status: "Done")` nötig — was auch der korrekte explizite Weg ist
- Das eigentliche "Complete" (Status auf terminal setzen) kann nur der Mensch/Agent bewusst via `task_edit` tun — ein dediziertes Tool dafür ist over-engineering

### 2. `archiveTask` und `completeTask` waren faktenäquivalent
Auf Filesystem-Ebene:
- `archiveTask()`: file-move, kein Status-Stamp
- `completeTask()`: file-move, dann `status: "Archived"` in Frontmatter
- Beide landeten in `backlog/archive/tasks/`
- `listCompletedTasks()` und `listArchivedTasks()` waren code-identisch (gleicher Ordner, kein Filter)

Der einzige Unterschied war der "Archived"-Stamp — kein Grund für zwei separate Methoden.

### 3. Cross-Modality-Inkonsistenzen
- MCP `task_archive`: hatte Guard gegen Archivierung von Terminal-Status-Tasks
- CLI `task archive`: hatte KEINEN Guard
- REST `DELETE /api/tasks/:id`: hatte KEINEN Guard
- TUI: beide Aktionen mit unterschiedlichen Guards

### 4. Prefix-Inkonsistenz
Einige MCP-Tools hatten `backlog_`-Prefix (`backlog_author_*`, `backlog_label_*`, `backlog_get_statistics`, `backlog_open_in_browser`), andere nicht (`task_*`, `decision_*`, `milestone_*`, etc.)

### 5. Eingebaute MCP-Docs referenzierten veraltetes Konzept
Die Dateien in `src/guidelines/mcp/` enthielten Anleitungen, die `task_complete` als separaten Schritt beschrieben.

## Decision

## Beschlossene Änderungen

### A) `task_complete` komplett entfernen (MCP + Core/FS + CLI + REST + WebUI + TUI)
- Kein dediziertes "Complete"-Tool mehr
- Ein Task wird via `task_edit(status: "Done")` auf terminalen Status gesetzt — explizit und klar
- Das Verschieben in den Archiv-Ordner ist eine separate Operation (s.u.)

### B) `archiveTask` wird zur einzigen "weg damit"-Operation
- `archiveTask` macht: file-move + stamp `status: "Archived"` in Frontmatter
- Bisheriger `completeTask`-Code (Stamp-Logik) wandert in `archiveTask`
- `completeTask()` wird aus Core und Filesystem entfernt

### C) Guards konsistent
- CLI `task archive` + MCP `task_archive` + REST `DELETE /api/tasks/:id`: blockieren Archivierung von Terminal-Status-Tasks
- TUI + WebUI: dürfen archivieren (mit menschlicher Bestätigung) — Mensch am Steuer

### D) Prefixe normalisieren: alle MCP-Tools ohne `backlog_`-Prefix
- `backlog_author_*` → `author_*`
- `backlog_label_*` → `label_*`
- `backlog_get_statistics` → `get_statistics`
- `backlog_open_in_browser` → `open_in_browser`

### E) MCP-Docs updaten
- `overview.md`, `overview-tools.md`, `task-finalization.md`: `task_complete`-Referenzen entfernen, `task_archive`-Beschreibung korrigieren

## Consequences

**Positiv:**
- Klareres Konzept: eine Operation für "weg damit" (archive), eine Operation für "fertig machen" (task_edit status=Done)
- Konsistentes Verhalten über alle 5 Modalitäten (CLI/MCP/REST/TUI/WebUI)
- Kürzere tool-Liste im MCP — weniger Verwirrung für Agenten
- Prefix-Vereinheitlichung reduziert cognitive load

**Risiken/Migration:**
- Bestehende Automatisierungen, die `task_complete` via MCP aufrufen, brechen
- Bestehende Skripte, die `backlog task complete` nutzen, brechen
- WebUI-API-Consumer, die `completeTask()` nutzen, müssen auf `archiveTask()` umsteigen
- Der `backlog cleanup`-Befehl muss auf `archiveTask` umgestellt werden (betrifft CLI + REST-Endpoint)

## Alternatives

## Verworfene Alternativen

### 1. Nur umbenennen: `completeTask` → `cleanupTask`
Hätte das Problem nicht gelöst, dass zwei fast identische Operationen existieren — nur die Verwirrung verschoben.

### 2. Beide Operationen behalten, aber klarer benennen
Zusätzlicher Wartungsaufwand ohne Mehrwert — die fachliche Unterscheidung (Done-task vs cancelled-task) ist nach dem Move in den Archiv-Ordner irrelevant.

### 3. `task_complete` repurposed: macht jetzt `task_edit(status=terminal)`
Wurde vom Product-Owner abgelehnt: "task_edit mit explizitem Status ist besser und expliziter. Man braucht kein extra Tool."