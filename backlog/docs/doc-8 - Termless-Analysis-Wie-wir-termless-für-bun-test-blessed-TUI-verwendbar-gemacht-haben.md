---
id: doc-8
title: >-
  Termless Analysis: Wie wir termless für bun:test + blessed TUI verwendbar
  gemacht haben
type: specification
created_date: '2026-05-22 12:47'
tags:
  - termless
  - testing
  - vterm
  - analysis
  - tui
  - bun
---
# Termless Analysis Report

## Zusammenfassung

`@termless/*` (v0.3.1, beorn/termless) ist eine vielversprechende Terminal-Testing-Library ("Playwright für Terminals"). Sie war jedoch **out-of-the-box nicht nutzbar** für unser Projekt aufgrund eines Packaging-Bugs und fehlender Device-Attribute-Responses. Dieser Report dokumentiert die Analyse und die entwickelte Lösung.

## Probleme

### Problem 1: Packaging Bug in @termless/* npm Paketen

Alle Sub-Pakete (@termless/test, @termless/xtermjs, @termless/vt100) werden als **raw TypeScript ohne Build-Schritt** auf npm published. Die Imports verwenden monorepo-relative Pfade (`../../../src/index.ts`, `../../../src/types.ts`, `../../../src/key-encoding.ts`), die nur innerhalb des termless-Monorepo selbst auflösbar sind.

**Beispiel**: `@termless/xtermjs/src/backend.ts` Zeile 18-19:
```typescript
import type { TerminalBackend, ... } from "../../../src/types.ts"
import { encodeKeyToAnsi } from "../../../src/key-encoding.ts"
```

Von `node_modules/@termless/xtermjs/src/backend.ts` aus wird `../../../src/types.ts` zu `node_modules/src/types.ts` — existiert nicht.

**Ausnahme**: `@termless/core` (v0.6.0) hat saubere relative Imports (`./types.ts`, `./terminal.ts`) und funktioniert standalone. Core ist die einzig sauber publizierte Komponente.

**Fix**: `bun patch @termless/xtermjs` — 2 Import-Zeilen von `../../../src/types.ts` → `@termless/core`. Funktioniert, ist aber ein Workaround.

### Problem 2: xtermjs Backend — Fehlende DA1/DA2 Device Attribute Responses

Selbst nach dem Packaging-Fix zeigte der xtermjs Backend ein fundamentales Problem: **blessed/neo-blessed TUI initialisiert nicht**.

**Ursache**: Blessed sendet beim Start DA1 (Device Attributes) Query (`\x1b[c`), DA2 (`\x1b[>c`) und DSR Cursor Position Report (`\x1b[6n`) an das Terminal. Die Antworten identifizieren den Terminal-Typ. xtermjs' headless Backend liefert diese Responses nicht vollständig → blessed bricht die Initialisierung ab.

Der kritische Code-Pfad:
1. blessed → PTY → `\x1b[c` (DA1)
2. PTY → termless → backend.feed(bytes) → xtermjs verarbeitet
3. xtermjs generiert Response → onResponse Callback
4. onResponse → PTY write → zurück zu blessed
5. blessed erhält `\x1b[?1;2c` → identifiziert Terminal als VT100 → fährt fort

xtermjs headless generiert diese Response nicht korrekt. Schritt 3/4 fehlschlagen.

### Problem 3: @termless/test setzt auf Vitest

`@termless/test` registriert Matcher via Vitest's `expect.extend()`. Unser Projekt nutzt `bun:test` (170+ Testfiles). Vitest reinzunehen wäre Overkill.

**Lösung**: `@termless/core` exportiert bereits `termlessMatchers` aus `jest-matchers.ts` mit dem Kommentar "Also works with Bun test". `expect.extend(termlessMatchers)` funktioniert out-of-the-box mit bun:test.

## Lösung: vterm.js Backend Adapter

### Warum vterm.js?

| Kriterium | @termless/xtermjs | vterm.js (Standalone) |
|---|---|---|
| Package | @termless/xtermjs v0.3.1 | vterm.js v0.4.0 |
| Monorepo Bug | ✅ Ja (muss bun patch) | ❌ Nein (Standalone) |
| terminfo.dev Coverage | ~85% (geschätzt) | **100% (161/161)** |
| DA1/DA2/DSR Responses | ❌ Unvollständig | ✅ Vollständig |
| blessed TUI kompatibel | ❌ Stirbt | **✅ Läuft** |
| Dependencies | @xterm/headless | Zero |
| Sprache | JS → TS raw | Pure TypeScript |
| Letztes Update | 0.3.1 (älter) | 0.4.0 (18. Apr 2026) |
| Autor | beorn/termless Monorepo | beorn/vterm (selber Autor, sauberer) |

### Adapter-Architektur

```
src/test/vterm-backend.ts
  ↓ implementiert TerminalBackend Interface (@termless/core)
  ↓ wrapt createVtermScreen() (vterm.js)
  ↓ feed()-Interception für DA1/DA2/DSR Queries
  ↓ onResponse → PTY write → blessed
```

Der Adapter interceptiert in `feed()` die Query-Sequenzen:
- `\x1b[c` / `\x1b[0c` → DA1 → Antwort `\x1b[?1;2c` (VT100 mit Advanced Video)
- `\x1b[>c` / `\x1b[>0c` → DA2 → Antwort `\x1b[>1;1234;0c` (xterm-kompatibel)
- `\x1b[6n` → DSR → Antwort `\x1b[row;colR` (Cursor Position Report)

Diese Responses werden über `backend.onResponse()` an termless' Terminal-Schicht weitergegeben, die sie via PTY an blessed zurückschreibt.

### Wrapper

```
src/test/termless-helper.ts
  ↓ ruft expect.extend(termlessMatchers) auf (bun:test kompatibel)
  ↓ exportiert term(cols, rows) als Convenience-Factory
  ↓ default Backend: vterm.js (via vterm-backend.ts)
```

## Ergebnis

- **blessed TUI Board**: Rendert korrekt in termless (Alt-Screen, Filter-Zeile, Kanban-Spalten, Zellen)
- **Cell-Level Assertions**: Bold, Color, Cursor, Modes — alles via `termlessMatchers`
- **CLI Output Tests**: `--plain`, `--version`, `task list --plain` — funktionieren
- **Geschwindigkeit**: ~1.9s für 4 Tests (Board, Alt-Screen, Cell-Styles, CLI-Spawn)

## Offene Punkte

1. **Feature Parity**: vterm-backend.ts hat ~95% der xtermjs Backend-Features. Fehlen:
   - Extended underline color attributes (selten benötigt)
   - Hyperlink/URL attributes (vterm.js hat `url` statt `hyperlink`)
2. **Scrollback**: getScrollback() liefert korrekte Werte, aber Scrollback-Tests fehlen noch
3. **Sixel/Kitty Graphics**: vterm.js unterstützt sixel, aber der Adapter deklariert es nur — nicht getestet

## Ausblick

- Adapter als `@termless/vterm-backend` upstream contributen (BACK-528)
- termless README um bun:test Kompatibilität ergänzen (termlessMatchers + expect.extend)
- termless in BACK-527 (Coverage Maximierung) als Standard-Test-Werkzeug nutzen

## Referenzen

- termless: https://github.com/beorn/termless | https://termless.dev
- vterm.js: https://github.com/beorn/vterm | npm: vterm.js
- terminfo.dev: https://terminfo.dev
- bun patch: https://bun.sh/docs/install/patch
