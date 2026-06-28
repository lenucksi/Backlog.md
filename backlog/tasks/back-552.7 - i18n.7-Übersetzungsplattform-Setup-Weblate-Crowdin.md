---
id: BACK-552.7
title: i18n.7- Übersetzungsplattform-Setup (Weblate/Crowdin)
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - infrastructure
  - ci
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: low
ordinal: 294000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Translation Management Platform einrichten für Community-Contributions.

Empfehlung: Weblate Cloud Libre (FOSS, native GitHub PRs, 160K Strings free).
Alternative: Crowdin Open (proprietär, unbegrenzt Strings, einfacher).

Setup:
1. Account auf Weblate/Crowdin erstellen
2. Repository verbinden (GitHub App)
3. i18n JSON Files als Übersetzungsquellen konfigurieren
4. CI/CD Pipeline: auto-PR bei neuen Übersetzungen
5. Dokumentation für Contributors: "How to add a language"
6. DE als erste Zielsprache importieren

Lieferartefakte:
- .github/workflows/translations.yml (optional, wenn Plattform das nicht selbst macht)
- CONTRIBUTING.md Abschnitt "Translations"
- Weblate/Crowdin Config Files (weblate.yml / crowdin.yml)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->