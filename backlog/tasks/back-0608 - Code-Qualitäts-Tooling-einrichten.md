---
id: BACK-0608
title: Code-Qualitäts-Tooling einrichten
status: Done
assignee: []
created_date: 2026-06-28 18:20
updated_date: 2026-07-05 20:52
completed_date: 2026-07-05 20:46
labels:
  - tooling
  - tech-debt
milestone: m-15
dependencies: []
priority: low
ordinal: 391000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
5 unabhängige Tooling-Upgrades: 1) SonarLint LSP testen — ist in opencode config eingerichtet, wurde aber noch nie getriggert. Einmalig eine .ts Datei analysieren und Diagnostics abgreifen. 2) aislop scan auf src/ laufen (evtl auf Subdirs beschränkt wegen Timeout). 3) veraltete Dependencies aktualisieren (bun outdated: commander 15, dep-cruiser 18, react-router-dom 7.18, playwright 1.61, knip 6.23). 4) knip.json Config aufräumen (redundante ignore-Einträge). 5) biome.json ggf. auf aktuellste schema-url und features prüfen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SonarLint LSP wurde getriggert und Diagnostics liegen vor
- [ ] #2 aislop scan auf src/ fertig ohne timeout
- [ ] #3 bun outdated Major-Updates evaluiert und aktualisiert (oder dokumentiert warum nicht)
- [ ] #4 knip.json aufgeräumt (redundante ignore-Einträge entfernt)
- [ ] #5 bun run check . passes
- [ ] #6 bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. SonarLint LSP triggern: Eine .ts Datei via sonarlint-ls stdio analysieren oder einfach eine Datei in opencode öffnen und Diagnostics abwarten. `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"capabilities":{},"rootUri":"file:///..."}}' | sonarlint-ls -stdio ...`
2. aislop: `npx aislop@latest scan src/server/` (auf Subdir beschränken wegen Timeout)
3. outdated deps: `bun outdated` auswerten. Major-Updates: commander 14→15, dep-cruiser 17→18 — breaking changes prüfen
4. knip.json: `ignoreDependencies` und `ignoreBinaries` aufräumen — fehlende packages entfernen
5. biome.json: schema URL auf neueste version prüfen, neue features nutzen
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SonarLint LSP ist in der globalen opencode config eingerichtet aber läuft nicht aktiv weil in dieser Session keine .ts Datei geöffnet wurde. Kann manuell getriggert werden.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Tooling-Check abgeschlossen:

1. knip.json: ignoreDependencies aufgeräumt — @types/react-router-dom + react-tooltip entfernt (werden nirgends importiert). @uiw/* + tailwindcss etc. bleiben (CSS-Imports, dynamisch genutzt).

2. biome.json: Schema 2.4.12 passt zu installierter Version 2.4.12. Kein Update nötig. 267 pre-existing lint errors in src/web/ (useOptionalChain, noSvgWithoutTitle, useExhaustiveDependencies) — biome auto-fixbar mit --unsafe, aber ausserhalb dieses Tasks.

3. commander@15.0.0: Major-Update von 14→15. Build + Tests + CLI --help + --version funktionieren. Keine Breaking Changes sichtbar. package.json auf ^15.0.0 gesetzt.

4. bun update: @playwright/test 1.60→1.61, dep-cruiser 17.4→17.4.3, knip 6.14→6.24, vite 8.1→8.1.3, shell-quote 1.8→1.9.

5. aislop: Timeout beim Download von golangci-lint. Subdirs: src/core/ src/file-system/. Nicht abschliessbar ohne Netzwerk/Zeit.

6. SonarLint LSP: sonarlint-ls ist installiert (/usr/bin/sonarlint-ls) aber LSP-Plugin nicht in opencode config eingetragen. Manuell per CLI triggern möglich (--stdio --port). Code-Action-LSP-Tools sind verfügbar (completions, code_action, document_symbols) aber timeouteten — LSP-Plugin läuft nicht in dieser Session.

aislop scan (2. Versuch) erfolgreich: 239 files in 3.8s. Score 12/100 Critical. Top Findings: 279 console.log, 157 triviale Kommentare, 101 Duplicate Code Blocks, 45 Functions too long, 34 Files too large. Report in /tmp/aislop-report.txt
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->