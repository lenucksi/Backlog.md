# Start-Prompt: Backlog.md i18n/Blocked-Status Fixes

## Kontext

Du arbeitest im Repository `/home/jo/kit/claude-code-llm-kram/Backlog.md`.
Das ist das Backlog.md Open-Source-Projekt selbst — TypeScript/Node.

Es gibt zwei fertige Bug-Reports die deine Arbeit vollständig beschreiben:
- `/home/jo/kit/kleinanzeigen-selloff/claude-code-skills/backlog-md-i18n-bug-report.md`
- `/home/jo/kit/kleinanzeigen-selloff/claude-code-skills/backlog-md-blocked-status-report.md`

Lies beide Reports als erstes vollständig.

---

## Tooling-Regeln (STRIKT — keine Ausnahmen)

**Code lesen, suchen, editieren: AUSSCHLIESSLICH Serena MCP.**
- `mcp__plugin_serena_serena__find_symbol` — Symbol/Funktion finden
- `mcp__plugin_serena_serena__search_for_pattern` — Pattern-Suche im Code
- `mcp__plugin_serena_serena__read_file` — Datei lesen
- `mcp__plugin_serena_serena__replace_symbol_body` — Funktion/Methode ersetzen
- `mcp__plugin_serena_serena__replace_content` — Beliebigen Inhalt ersetzen
- `mcp__plugin_serena_serena__find_referencing_symbols` — Alle Aufrufer einer Funktion finden
- `mcp__plugin_serena_serena__insert_after_symbol` / `insert_before_symbol` — Code einfügen

**Kein Read-Tool, kein Edit-Tool, kein Write-Tool, kein Bash-grep für Code.**
Bash darf nur für: Git-Operationen, Tests ausführen, Backlog-CLI.

**Serena-Projekt aktivieren vor dem ersten Zugriff:**
```
mcp__plugin_serena_serena__activate_project { "project": "/home/jo/kit/claude-code-llm-kram/Backlog.md" }
```

**Backlog-CLI Binary:** `~/.bun/bin/backlog`
Alle Backlog-Operationen über die CLI ausführen (im Projektverzeichnis).
Backlog-Dateien NIEMALS direkt lesen oder schreiben.

---

## Prozess (7 Schritte — für jeden Task)

### Schritt 1 — Plan Mode
Vor jeder Implementierung Plan Mode aktivieren.
Kein Code anfassen bis der Plan steht und akzeptiert ist.

### Schritt 2 — Plan erarbeiten
Task analysieren, Codebase mit Serena explorieren, Plan formulieren.
Feedback-Schleife bis der Nutzer den Plan explizit akzeptiert.

### Schritt 3 — Plan in Backlog-Task schreiben
Sobald akzeptiert: Plan als `## Implementation Plan`-Sektion in den Task.
```bash
~/.bun/bin/backlog task edit <ID> --plan "..."
```

### Schritt 4 — Feature-Branch anlegen + Task auf "In Progress"
```bash
git checkout -b fix/<task-id>-<kurzer-slug>
~/.bun/bin/backlog task edit <ID> --status "In Progress"
```
Branch-Naming: `fix/task-a-terminal-status-core`, `fix/task-b-active-filters`, usw.

### Schritt 5 — Implementieren + Tests
Ausschließlich Serena MCP für alle Code-Änderungen.
Tests für jeden Fix direkt mitschreiben oder anpassen — nicht auf Task E verschieben.
Nach jeder logischen Einheit: atomarer Git-Commit auf dem Feature-Branch.

### Schritt 6 — Implementation Notes + alle Tests grün
```bash
~/.bun/bin/backlog task edit <ID> --notes "..."   # append-only, niemals --notes überschreiben
```
Vor dem Merge: Testsuite vollständig grün. Kein roter Test darf verbleiben.
```bash
bun test   # oder das projekteigene Test-Command
```

### Schritt 7 — Task abschließen + Branch mergen (stehen lassen)
```bash
~/.bun/bin/backlog task edit <ID> --status "Done"
~/.bun/bin/backlog task complete <ID>
git checkout main
git merge --no-ff fix/<task-id>-<slug>
# Branch NICHT löschen — bleibt für PR stehen
```
Dann weiter mit dem nächsten Task (neuer Branch von main).

---

## Fix-Strategie: Option C — `terminalStatuses` (plural)

**Nicht** Fix-A (last-element convention) und **nicht** Fix-B (single `terminalStatus` key).
Es wird **Fix-C** umgesetzt: ein optionaler Config-Key `terminalStatuses` als Array,
der mehrere Abschluss-Zustände erlaubt (z.B. "Fertig" und "Abgebrochen").

```yaml
# config.yml — Beispiel nach dem Fix
statuses:
  - "Offen"
  - "In Arbeit"
  - "Blockiert"
  - "Fertig"
terminalStatuses:           # optional, neu
  - "Fertig"
  - "Abgebrochen"
```

**Fallback-Verhalten (Backward Compatibility):**
Ist `terminalStatuses` nicht gesetzt, fällt der Code auf die bisherige Konvention zurück:
letztes Element von `statuses` = terminal. Kein Breaking Change für bestehende Boards.

**Kernanpassung in `src/utils/terminal-status.ts`:**
- `getTerminalStatus(statuses)` → `getTerminalStatus(statuses, terminalStatuses?)` — gibt
  primären Terminal-Status zurück (für Anzeige, Cleanup-Trigger etc.)
- `isTerminalStatus(status, statuses)` → `isTerminalStatus(status, statuses, terminalStatuses?)`
  — gibt `true` für jeden Status in `terminalStatuses` zurück
- Alle Aufrufer müssen `config.terminalStatuses` durchreichen

---

## Aufgabe: Tasks anlegen und nacheinander abarbeiten

### Phase 0 — Tasks aus den Reports anlegen

Lege folgende Tasks im Backlog des Repos an (`~/.bun/bin/backlog task create ...`).
Jeder Task braucht Titel + Beschreibung. Bugs sind in den Reports vollständig dokumentiert.

**Task A — Config-Schema: `terminalStatuses`-Key einführen**
Neuer optionaler Key `terminalStatuses: string[]` im Config-Typ und Config-Loader.
`terminal-status.ts` anpassen: `getTerminalStatus` und `isTerminalStatus` nehmen
`terminalStatuses?` als optionalen Parameter, Fallback auf last-element-Konvention.
Config-Schema-Validierung und Typ-Definitionen aktualisieren.
Tests: `terminal-status.test.ts` um Custom-Statuses und Multi-Terminal-Szenarien erweitern.

**Task B — Kern-Fix: `isTerminalStatus` in statistics.ts, handlers.ts, milestones.ts**
Betrifft Bugs #1–#4 aus dem i18n-Report. Alle 5 hardcodierten `"Done"`-Checks in
`statistics.ts`, die private `isDoneStatus()` in `handlers.ts` und die lokale
`isDoneStatus()` in `milestones.ts` durch `isTerminalStatus(status, statuses, terminalStatuses)`
ersetzen. Config wird in jedem Kontext geladen und durchgereicht.
Tests: `statistics.test.ts` und `handlers.test.ts` um German-board-Szenarien erweitern.

**Task C — Sekundär-Fix: Aktiv-Task-Filter**
Betrifft `backlog.ts:1955/1971/1990`, `cli.ts:3348`, `sequences.ts:420`,
`board.ts:50-52`, `lanes.ts:206`. Alle `.toLowerCase() !== "done"`-Filter auf
`isTerminalStatus` umstellen. Config jeweils laden und `terminalStatuses` durchreichen.
Tests: bestehende Filter-Tests auf Custom-Status-Konfiguration prüfen und ggf. ergänzen.

**Task D — Bug #6: Custom Blocked-Status Styling**
`status-icon.ts` und `TaskColumn.tsx`: hardcodierte `"Blocked"`/`"blocked"`-Checks durch
Config-aware Lösung ersetzen. Neuer optionaler Config-Key `blockedStatuses: string[]`
analog zu `terminalStatuses`. Fallback: substring-Heuristik `includes("blocked")` bleibt
für englische Boards erhalten. Details im Blocked-Report.
Tests: `status-icon.test.ts` um Custom-Blocked-Status-Szenarien erweitern.

### Phase 1 — Reihenfolge

**A → B → C → D**

A muss zuerst, weil B, C, D alle auf dem erweiterten `isTerminalStatus`-Interface aufbauen.
D ist unabhängig von B/C, aber setzt A (Config-Schema) voraus.

Nach jedem Task: `bun test` vollständig grün, dann merge, dann nächster Branch.

---

## Branch- und Merge-Schema

```
main
 ├── fix/task-a-terminal-statuses-config    ← nach Fertigstellung gemergt, bleibt stehen
 ├── fix/task-b-core-done-checks            ← nach Fertigstellung gemergt, bleibt stehen
 ├── fix/task-c-active-filters              ← nach Fertigstellung gemergt, bleibt stehen
 └── fix/task-d-blocked-styling             ← nach Fertigstellung gemergt, bleibt stehen
```

Jeder Branch ist PR-ready: ein kohärenter Fix, grüne Tests, atomare Commits.

---

## Wichtige Dateien laut Reports

| Datei | Relevanz |
|---|---|
| `src/utils/terminal-status.ts` | Kern-Utility — wird in Task A erweitert |
| `src/core/statistics.ts` | Bugs #2, #3 — 5x hardcodiertes `"Done"` |
| `src/mcp/tools/tasks/handlers.ts` | Bug #1 — private `isDoneStatus()` |
| `src/core/milestones.ts` | Bug #4 — lokale `isDoneStatus()` |
| `src/ui/board.ts` | Sekundär — lokale `isDoneStatus()` |
| `src/web/lib/lanes.ts` | Sekundär — inline `isDoneStatus` |
| `src/core/backlog.ts` | Sekundär — 3x `.toLowerCase() !== "done"` |
| `src/cli.ts` | Sekundär — 1x `.toLowerCase() !== "done"` |
| `src/ui/sequences.ts` | Sekundär — 1x `.toLowerCase() !== "done"` |
| `src/ui/status-icon.ts` | Bug #6 — hardcodierter `Blocked`-Key |
| `src/web/components/TaskColumn.tsx` | Bug #6 — `includes('blocked')` |
| `src/constants/index.ts` | `DEFAULT_STATUSES` — Referenz |
| `src/test/terminal-status.test.ts` | Tests für Task A |
| `src/test/statistics.test.ts` | Tests für Task B |

---

## Akzeptanzkriterien (Gesamtziel)

Nach Abschluss aller Tasks funktionieren folgende Szenarien korrekt für ein Board mit:
```yaml
statuses: ["Offen", "In Arbeit", "Blockiert", "Fertig"]
terminalStatuses: ["Fertig", "Abgebrochen"]
```

- `task complete` via CLI und MCP funktioniert für "Fertig"-Tasks
- Statistics zeigt korrekte "completed"-Zahl
- Dependency-basierte "blocked tasks" werden korrekt aufgelöst sobald Dependency "Fertig" ist
- Milestone-Fortschritt wird korrekt berechnet
- Aktiv-Task-Filter schließt "Fertig"-Tasks aus Sequenzen und Boards aus
- "Blockiert"-Tasks bekommen rotes Styling
- Mehrere Terminal-Statuses werden überall korrekt erkannt
- Alle bestehenden Tests bleiben grün
- Neue Tests decken Custom-Status- und Multi-Terminal-Szenarien ab
- Boards ohne `terminalStatuses` in config verhalten sich identisch wie vorher (last-element Fallback)
