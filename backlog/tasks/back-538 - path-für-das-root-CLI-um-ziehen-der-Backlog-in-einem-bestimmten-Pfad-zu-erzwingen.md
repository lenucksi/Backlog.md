---
id: BACK-538
title: --path für das root CLI um ziehen der Backlog in einem bestimmten Pfad zu
  erzwingen
status: Done
assignee: []
created_date: 2026-06-03 10:17
updated_date: 2026-06-09 12:16
labels: []
dependencies: []
priority: high
ordinal: 262000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
backlog --path ~/pfadmitbacklogordner doc update ....

usw sollen funktionieren. das soll im root von backlog cli liegen damit es für jedes kommando ausgeführt wernde kann.

muss dann natürlcih auch in der --help dokumentiert sein.

und mit TUI/MCP/WEBUI funktinoeren. Könnte für MCP auch sehr nützlich sein.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan: Global `--path` Option for Backlog CLI

### Problem
Benutzer müssen den Backlog-Root-Pfad explizit angeben können (`backlog --path ~/pfadmitbacklogordner doc update ...`), statt dass immer nur automatisch aus dem CWD gesucht wird. Derzeit gibt es nur `BACKLOG_CWD` env var und `mcp start --cwd` als Override-Mechanismen.

### Architektur
Alle CLI-Commands rufen `requireProjectRoot()` aus `src/utils/cli-context.ts` auf, das wiederum:
1. `resolveRuntimeCwd()` aufruft (prüft `BACKLOG_CWD` env → `process.cwd()`)
2. `findBacklogRoot(cwd)` aufruft (walkt Baum hoch, sucht backlog/ Konfiguration)

Der `--path` Flag soll direkt den Projekte-Root setzen und die Auto-Detection überspringen.

### Implementierungsschritte

#### Schritt 1: `src/utils/cli-context.ts`
- Füge `_explicitProjectPath: string | undefined` als Module-level Variable hinzu
- Füge `setExplicitProjectPath(path?: string)` Export hinzu
- Ändere `requireProjectRoot()`:
  - Wenn `_explicitProjectPath` gesetzt ist, überspringe `resolveRuntimeCwd()` + `findBacklogRoot()` komplett
  - Validiere: Pfad muss existieren und ein Directory sein
  - Optional: Prüfe ob gültiger Backlog-Root (hat config) – wenn nicht, fallback auf Auto-Detection

#### Schritt 2: `src/cli.ts`
- Füge `--path <path>` als Root-Level Option zum `program` hinzu (Commander `.option()`)
- Parse `--path` aus argv (analog zu `getMcpStartCwdOverrideFromArgv()` für `--cwd`)
- Setze `requireProjectRoot` mit `setExplicitProjectPath()` vor dem Command Dispatch
- **Splash Screen**: Nutze `--path` auch für die Splash-Autodection
- **Config Migration**: Nutze `--path` auch für die Pre-Command Config Migration

#### Schritt 3: `src/commands/mcp.ts`
- Füge `--path <path>` Option zu `mcp start` hinzu (zusätzlich zu bestehendem `--cwd`)
- `--path` hat Vorrang vor `--cwd`
- Nutze `setExplicitProjectPath()` auch hier für Konsistenz

#### Schritt 4: Multi-Modality Coverage
Da alle Modi (CLI, TUI, WebUI, REST, MCP) letztlich über CLI-Commands initialisiert werden, die `requireProjectRoot()` aufrufen, ist der `--path` Mechanismus automatisch für alle 5 Zugriffsmodi verfügbar:

- **CLI**: `backlog --path ~/repo task list` → direkt
- **TUI**: `backlog --path ~/repo overview` → über `requireProjectRoot()`
- **WebUI**: `backlog --path ~/repo browser` → über `requireProjectRoot()`
- **REST**: `backlog --path ~/repo browser` → Server bekommt den Pfad
- **MCP**: `backlog --path ~/repo mcp start` → über `--path` Option

#### Schritt 5: Tests
- `src/test/backlog-directory.test.ts` existiert bereits – erweitern um `--path` tests
- Unit-Tests für `setExplicitProjectPath()` + `requireProjectRoot()` mit override
- CLI-Integrationstest: `backlog --path /tmp/test-project task list`

### Dateien die geändert werden
1. `src/utils/cli-context.ts` – Core override logic
2. `src/cli.ts` – Root `--path` option + argv parsing
3. `src/commands/mcp.ts` – MCP `--path` option
4. `src/test/backlog-directory.test.ts` – Tests

### Referenzen
- `src/utils/runtime-cwd.ts` – Bestehender `BACKLOG_CWD` env Mechanismus als Referenz
- `src/cli.ts` – `getMcpStartCwdOverrideFromArgv()` pattern
- `src/commands/mcp.ts` – Bestehender `--cwd` flag als Vorbild
- `src/utils/cli-context.ts` – `requireProjectRoot()` zentrale Änderung
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->



## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `backlog --path <dir> <command>` funktioniert für alle CLI-Kommandos
- [x] #2 `--path` überspringt auto-detection und nutzt den angegebenen Pfad direkt
- [x] #3 `backlog --help` zeigt `--path` an
- [x] #4 `--path` funktioniert mit `mcp start`
- [x] #5 TUI (overview/board) funktioniert mit `--path`
- [x] #6 WebUI/REST (browser) funktioniert mit `--path`
- [x] #7 `BACKLOG_CWD` env var bleibt kompatibel (niedrigere Priorität als `--path`)
- [x] #8 bunx tsc --noEmit passes
- [x] #9 bun run check . passes
- [x] #10 bun test passes (inkl. neue Tests)
<!-- AC:END -->