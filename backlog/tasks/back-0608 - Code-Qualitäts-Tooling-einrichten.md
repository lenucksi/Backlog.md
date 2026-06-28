---
id: BACK-0608
title: Code-Qualitäts-Tooling einrichten
status: To Do
assignee: []
created_date: 2026-06-28 18:20
updated_date: 2026-06-28 18:20
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->