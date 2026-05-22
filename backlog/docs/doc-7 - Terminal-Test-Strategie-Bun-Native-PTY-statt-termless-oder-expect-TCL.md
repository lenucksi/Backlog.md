---
id: doc-7
title: 'Terminal-Test-Strategie: Bun Native PTY statt @termless/* oder expect-TCL'
type: specification
created_date: '2026-05-22 12:04'
tags:
  - testing
  - tui
  - terminal
  - bun
  - decision
---
# Terminal-Test-Strategie: Bun Native PTY

## Kontext

Für das Backlog.md-Projekt benötigen wir eine zuverlässige, wartbare Methode zum Testen der TUI (Terminal User Interface) Komponenten, die auf `neo-neo-bblessed` basieren.

## Evaluierte Optionen

### Option 1: `@termless/*` (npm-Pakete)
- **Status**: ❌ Nicht nutzbar
- **Version**: v0.3.1 (neueste)
- **Problem**: Alle Pakete (@termless/test, @termless/xtermjs, @termless/vt100, @termless/core) werden als raw TypeScript ohne Build-Schritt auf npm published. Die Imports verwenden monorepo-relative Pfade (`../../../src/index.ts`, `../../../src/types.ts`, `../../../src/backends.ts`), die nur im termless-Monorepo selbst auflösbar sind.
- **Betroffen**: `@termless/test/src/fixture.ts:45` importiert `{ createTerminal } from "../../../src/index.ts"` — in einer Consumer-App existiert dieser Pfad nicht.
- **Einzige Ausnahme**: `@termless/core` hat saubere relative imports (`./types.ts`, `./terminal.ts`) und funktioniert standalone. Die Backend-Pakete (@termless/xtermjs, @termless/vt100) haben aber alle die broken paths.

### Option 2: `expect`-TCL (vorherige Lösung)
- **Status**: ❌ Ersetzt
- **Probleme**: 
  - Abhängigkeit von TCL/tcllib (`expect`-Binary)
  - Nur auf Linux/Unix verfügbar (nicht macOS/Windows)
  - TCL-Script als String in TypeScript generiert → kein TypeScript-Syntax-Highlighting
  - Langsam (~30s pro Testlauf durch TCL-Interpreter-Overhead)

### Option 3: Bun Native PTY (gewählte Lösung)
- **Status**: ✅ Implementiert
- **Mechanismus**: `Bun.spawn()` mit `terminal`-Option
- **Vorteile**:
  - Keine externen Abhängigkeiten (Bun native API)
  - Plattformunabhängig (Bun läuft auf Linux, macOS, Windows)
  - TypeScript-nativ — keine interprozess-Kommunikation mit TCL
  - Schnell (~6.7s statt ~30s)
  - `describe.skip` für nicht-Unix-Plattformen via `process.platform !== "win32"`

## Architekturentscheidung

```typescript
// Standard-Pattern für TUI-Tests mit Bun PTY
const proc = Bun.spawn(cliCmd, {
    env: { ...process.env, TERM: "xterm-256color", NO_COLOR: "1" },
    terminal: {
        cols: 120, rows: 40,
        data: (_term, data: Uint8Array) => {
            buffer += new TextDecoder().decode(data);
        },
    },
});

const pty = proc.terminal as { write: (data: string) => void; close: () => void };

// Tasten simulieren
pty.write("E");         // Editor öffnen
pty.write("\u001b[A");  // Pfeil hoch
pty.write("q");         // Beenden

// Auf Output warten (Polling)
await waitForOutput(buffer, "Backlog Board");
```

## Konsequenzen

- `@termless/*` bleibt auf der Watchlist — falls die Packages jemals korrekt gebuilded published werden, ist ein Wechsel möglich. Die Schnittstelle (`createTestTerminal`, `term.spawn`, Matcher) ist dokumentiert.
- Für Unit-Tests der Widgets weiterhin `mock.module("neo-neo-bblessed")` (Pattern aus board-coverage.test.ts)
- Für Integration/E2E-Tests der TUI Bun native PTY
- Keine Änderung an der Widget-Library nötig (bleibt `neo-neo-bblessed` 1.0.9)
