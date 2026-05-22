---
id: BACK-513
title: 'Research: TUI interactive editor handoff test reliability'
status: Done
assignee: []
created_date: '2026-05-21 01:39'
updated_date: '2026-05-22 15:07'
labels:
  - research
  - testing
  - tui
  - ci
dependencies: []
priority: low
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Der interaktive TUI-Test (`src/test/tui-interactive-editor-handoff.test.ts`) testet den Editor-Handoff aus Board/Task-Liste. Er ist seit seiner Einführung (BACK-389) instabil.

## Historie
- BACK-389: Original-Implementierung mit `node-pty`
- BACK-396: Permanent fix (laut Changelog) — aber weiterhin flaky
- BACK-494: Refactor (node-pty → erneut node-pty). Erkenntnis: `node-pty` funktioniert **nicht** unter Bun (native addon hängt)
- Revert zu `expect` — aber `expect` ist auf neueren ubuntu-latest Runnern nicht mehr vorinstalliert
- Aktuell: Test in CI deaktiviert (kein `RUN_INTERACTIVE_TUI_TESTS=1`), nur lokal/manuell nutzbar

## Ursachen für Flakiness
1. node-pty inkompatibel mit Bun → kein PTY → TUI startet nicht
2. expect ist nicht auf CI-Runnern vorinstalliert (apt-get nötig)
3. TUI-Rendering via blessed ist timingabhängig → expect-Muster matchen nicht immer
4. Test dauert 2+ Minuten in CI

## Optionen
1. **So lassen** — Test nur lokal via `RUN_INTERACTIVE_TUI_TESTS=1`
2. **expect+apt-get** in CI — flaky aber vollständig
3. **Test entfernen** — Wenn seit Ewigkeiten keine Regression gefunden, braucht ihn keiner
4. **Bun-PTY-Lösung finden** — Bun native PTY-API statt node-pty (existiert aktuell nicht)

## Referenzen
- CI run #49 (letzter mit aktiviertem Test): https://github.com/lenucksi/Backlog.md/actions/runs/26199896225
- SonarQube S2187 auf dieser Datei (false positive — Test hat 2 Cases, nur skipped)
- BACK-389, BACK-396, BACK-494
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Research outcome: Bun native PTY (via `Bun.spawn` + `terminal` option) replaces node-pty AND expect-TCL. 

Test `tui-interactive-editor-handoff.test.ts` wurde auf termless/vterm.js Backend migriert (BACK-526). Der Test läuft stabil in ~11s (vorher ~2min via expect-TCL) und wird in CI auf ubuntu-latest ausgeführt.

Option 4 aus der Research ("Bun-PTY-Lösung") wurde implementiert. Die Bun native PTY-API existiert und funktioniert. Test ist nicht mehr flaky.
<!-- SECTION:FINAL_SUMMARY:END -->
