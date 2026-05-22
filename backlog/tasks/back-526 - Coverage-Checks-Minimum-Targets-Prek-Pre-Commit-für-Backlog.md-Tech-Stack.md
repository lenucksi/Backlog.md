---
id: BACK-526
title: 'Coverage-Checks, Minimum-Targets & Prek-Pre-Commit für Backlog.md Tech-Stack'
status: Done
assignee: []
created_date: '2026-05-22 10:37'
updated_date: '2026-05-22 15:02'
labels:
  - ci
  - testing
  - coverage
  - quality
  - prek
  - pre-commit
milestone: m-13
dependencies: []
references:
  - 'file:///home/jo/kit/homeass/rig-for-red/prek.toml'
  - 'file:///home/jo/kit/homeass/rig-for-red/.github/workflows/prek.yml'
  - 'file:///home/jo/kit/homeass/VevorWeatherbridge/.pre-commit-config.yaml'
  - 'file:///home/jo/kit/claude-code-llm-kram/Backlog.md/.github/workflows/ci.yml'
  - >-
    doc-7 - Terminal-Test-Strategie: Bun Native PTY statt @termless/* oder
    expect-TCL
priority: high
ordinal: 232000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI/Qualitäts-Infrastruktur für dieses Repo nach dem Vorbild von rig-for-red und VevorWeatherbridge, aber angepasst an den hiesigen Tech-Stack (TypeScript, Bun, Biome statt Python/Ruff).

Was soll passieren:
1. **Coverage-Checks mit Minimum-Targets** — CI erzwingt eine Coverage-Mindestschwelle (z.B. ≥50% global, oder differenziert pro Bereich). Aktuell läuft `bun test --coverage` in CI (s. .github/workflows/ci.yml Zeile 72-78) ohne fail-untergrenze. Lcov-Report wird erzeugt und an SonarQube übergeben, aber es gibt keinen harten CI-Break bei Unterschreitung.

2. **prek-Setup für pre-commit Hooks** — prek (Rust alternative zu pre-commit) konfigurieren mit:
   - builtin-hooks (trailing-whitespace, end-of-file-fixer, check-yaml/json/toml, check-added-large-files, mixed-line-ending, check-merge-conflict, detect-private-key)
   - Biome (lint + format) statt Ruff
   - conventional-commit-check (commit-msg stage)
   - Husky ersetzen oder prek daneben betreiben (aktuell Husky + lint-staged in package.json)

3. **GitHub Actions CI-Workflow für prek** — analog zu rig-for-reds `.github/workflows/prek.yml`, der `j178/prek-action@v2` in PRs und auf main/dev ausführt.

Referenzen:
- prek-Konfig in rig-for-red: /home/jo/kit/homeass/rig-for-red/prek.toml
- prek CI-Workflow rig-for-red: /home/jo/kit/homeass/rig-for-red/.github/workflows/prek.yml
- pre-commit-config in VevorWeatherbridge: /home/jo/kit/homeass/VevorWeatherbridge/.pre-commit-config.yaml
- Existierende CI hier: .github/workflows/ci.yml (coverage-report ohne fail)
- Bestehender Husky/lint-staged in package.json
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Coverage-Mindestschwelle (≥50%) im CI erzwingt harten Fail bei Unterschreitung
- [x] #2 prek.toml mit Builtin-Hooks + Biome-Lint/Format + commit-msg check erstellt
- [x] #3 prek läuft lokal via `prek run --all` ohne Fehler
- [x] #4 GitHub Actions Workflow prek.yml analog zu rig-for-red implementiert
- [x] #5 Husky/lint-staged durch prek ersetzt oder kompatibel daneben
- [x] #6 Alle bestehenden CI-Checks bleiben grün
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Gesamtplan (4 Subtasks)

### BACK-526.A — prek-Setup + Husky-Migration
- prek.toml mit builtin-hooks + biome-changed + conventional-commit
- Husky raus, prek install
- .github/workflows/prek.yml

### BACK-526.B — Coverage-Threshold 50%
- --coverage-threshold=50 in ci.yml

### BACK-526.C — @termless/test Integration
- C1: Smoke-Test (Proof-of-Concept)
- C2: existierenden expect-TCL-Test ersetzen
- C3: compiled-binary CI-Bug fixen (RUN_INTERACTIVE_TUI_TESTS fehlt)

### BACK-526.D — Release auf GitHub Packages
- release.yml: npmjs.org → GitHub Packages (@lenucksi)
- Binaries bleiben via GitHub Releases
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

### @termless/* v0.3.1 Packaging Bug
Alle `@termless/*` npm-Pakete (test, xtermjs, vt100, core) werden als **raw TypeScript ohne Build-Schritt** published. Die Imports verwenden monorepo-relative Pfade (`../../../src/index.ts`, `../../../src/types.ts` etc.) die nur innerhalb des termless Monorepo funktionieren. In einer Consumer-App wie unserem Backlog.md-Projekt brechen sie mit `Cannot find module '../../../src/index.ts'`.

Das Paket `@termless/core` hat **saubere relative imports** (`./types.ts`, `./terminal.ts`) und funktioniert standalone — aber die Backend-Pakete (@termless/xtermjs, @termless/vt100) haben alle die monorepo-relative Pfad-Problematik und sind daher nicht nutzbar.

### Gewählte Lösung: Bun Native PTY
Bun hat native PTY-Unterstützung via `Bun.spawn()` mit `terminal: { cols, rows, data }`-Option. Damit können wir:
- Echte PTY-Prozesse spawnen (genau wie `expect`-TCL oder `node-pty`)
- Tasten simulieren via `proc.terminal.write(data)`
- Terminal-Output empfangen via `data`-Callback
- Asynchron auf erwartete Outputs warten (einfaches Polling mit `buffer.indexOf()`)

Keine externen Abhängigkeiten nötig — Bun macht alles nativ.

### Vergleich: expect-TCL → Bun PTY
- **expect**: TCL-Script als String generiert, `Bun.spawn(["expect", "-f", script])` nötig
- **Bun PTY**: `Bun.spawn(cmd, { terminal: { cols, rows, data } })` + `proc.terminal.write(data)`
- Kein `expect`-Binary mehr nötig (läuft jetzt plattformunabhängig)
- Tests: 6.7s statt ~30s (kein TCL-Interpreter-Overhead)
- 2 Tests via describe.skip für Nicht-Unix (nur Bun.spawn mit terminal-Option)

### Coverage Threshold Entscheidung
Aktuelle Coverage: ~48% (minimal, mit core.test.ts allein). Mit allen Tests: ~65-75%. Threshold 50% ist ein sicherer Startwert. Nach BACK-512 (TUI-Files auf 20%+) und Coverage-Investitionen schrittweise auf 65% → 75% → 85% erhöhen.

### Entscheidungen zur Release-Methode
- GitHub Packages (@lenucksi) statt npmjs.org
- GITHUB_TOKEN für Auth
- Binaries bleiben via GitHub Releases (softprops/action-gh-release)
- Paketnamen: @lenucksi/backlog.md, @lenucksi/backlog.md-linux-x64 etc.

### Termless vterm.js Backend PoC (Nachtrag)

Nachdem @termless/* v0.3.1 Packaging-Bug und fehlende DA1/DA2 Responses in xtermjs festgestellt wurden:

1. **xtermjs Backend Analyse**: xtermjs hat unvollständige DA1/DA2 Device Attribute Responses — blessed bricht ab, wenn es die Terminal-Identität nicht abfragen kann.

2. **Problem-Ursache**: Der `onResponse`-Callback des TerminalBackend wird von xtermjs nicht korrekt bedient.

3. **vterm.js Entdeckung**: Standalone Paket (npm: vterm.js, v0.4.0) — 100% terminfo.dev Feature Coverage (161/161), zero dependencies, pure TypeScript, kein monorepo packaging bug.

4. **Adapter gebaut**: `src/test/vterm-backend.ts` implementiert `TerminalBackend` Interface mit feed-Interception für DA1/DA2/DSR Queries → Responses werden via `onResponse` zurück durch die PTY an blessed gesendet.

5. **Ergebnis**: blessed TUI Board rendert korrekt (Alt-Screen, Kanban-Spalten, Suchzeile). Cell-Level Assertions (bold, color) funktionieren.

6. **Architektur**: vterm-backend.ts (Adapter) + termless-helper.ts (Wrapper) als Standard.

Referenz: doc-8 (Termless Analysis Report)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## 4 Workstreams implementiert

### Workstream A — prek-Setup + Husky-Migration ✅
- `prek.toml` mit builtin-hooks (trailing-whitespace, end-of-file-fixer, check-yaml/json/toml, check-added-large-files, check-merge-conflict, detect-private-key, mixed-line-ending)
- `local` hook: `bunx biome check --changed --write` (nur geänderte Files)
- `local` hook: conventional-commit check für commit-msg stage
- Husky + lint-staged aus package.json entfernt, `"prepare": "prek install"`
- `.husky/` gelöscht (prek hat eigene Struktur unter `.husky/_/`)
- `.husky/_` zu `.gitignore` hinzugefügt
- `biome.json` um `defaultBranch: "main"` ergänzt für `--changed`-Support

### Workstream B — Coverage-Threshold 50% ✅
- `--coverage-threshold=50` zu `bun test --coverage` in CI hinzugefügt (Linux, macOS, Windows)
- CI bricht jetzt hart ab, wenn globale Coverage unter 50% fällt
- Threshold kann später erhöht werden (nach BACK-512 Fortschritt)

### Workstream C — @termless/test Integration ✅
- **`@termless/*` getestet**: Alle npm-Pakete (@termless/test, @termless/xtermjs, @termless/vt100, @termless/core) wurden evaluiert — sie haben einen **Packaging-Bug** (monorepo-relative Pfade `../../../src/index.ts` in published raw TypeScript, v0.3.1). `@termless/core` allein funktioniert, aber Backends (@termless/xtermjs, @termless/vt100) haben broken imports.
- **Smoke-Test** (`tui-termless-smoke.test.ts`): Nutzt Bun's native PTY (`Bun.spawn` mit `terminal`-Option) statt `expect`-TCL oder `@termless/*`. Testet CLI `--plain` output.
- **Interactive Editor Handoff Test migriert**: `tui-interactive-editor-handoff.test.ts` komplett von `expect`-TCL auf Bun's native PTY umgestellt. Tests: board-view + task-list-view Editor-Handoff. Beide Tests laufen in ~6.7s (vorher ~30s via expect-TCL).
- **CI-Bug fix**: compiled-binary Step hatte fälschlich `RUN_INTERACTIVE_TUI_TESTS=1` nicht gesetzt — Tests wurden immer geskipped. Jetzt korrekt mit Umgebungsvariablen.
- **Transcript-Upload** aus CI entfernt (nicht mehr nötig).
- **`scripts/run-tui-interactive-tests.sh`** vereinfacht (kein `expect`-Check mehr nötig).
- **Alle `@termless/*` Pakete entfernt** (wurden nicht benötigt).

### Workstream D — Release auf GitHub Packages ✅
- `release.yml`: npmjs.org → GitHub Packages (`@lenucksi` scope)
- Paketnamen: `backlog.md` → `@lenucksi/backlog.md`, platform packages → `@lenucksi/backlog.md-linux-x64` etc.
- Auth via `GITHUB_TOKEN` + `.npmrc` (wie `publish-backlog-guard.yml`)
- `repository.url` auf `github.com/lenucksi/Backlog.md` aktualisiert
- `permissions: packages: write` hinzugefügt
- `verify-platform-packages` + `install-sanity` Jobs für GitHub Packages angepasst
- GitHub Releases (`softprops/action-gh-release`) bleibt unverändert
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
