---
id: BACK-552
title: i18n- Web UI + TUI Internationalisierung (DE + EN) mit i18next
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - web
  - tui
  - cli
  - port
  - upstream
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/386
  - https://github.com/MrLesk/Backlog.md/pull/669
priority: high
ordinal: 287000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent-Task für die Internationalisierung des gesamten Forks (Web UI + TUI + CLI).

Scope: Web UI, TUI, CLI (MCP ausgenommen). Startsprachen: DE + EN.
Bibliothek: i18next + react-i18next (für Web), shared i18next core (für TUI/CLI).
Übersetzungsplattform: Weblate Cloud Libre (oder Crowdin) für Community-Contributions via GitHub PRs.

Architektur:
- i18next Core wird von TUI + Web geteilt (gleiche Translation Files)
- react-i18next nur im Web-Bundle
- TypeScript Type Safety via i18next-cli types oder i18next-resources-for-ts
- Namespace-basiert: translation.json (UI) + commands.json (CLI)
- Locale aus backlog/config.yml (persistiert)

Upstream Referenzen:
- https://github.com/MrLesk/Backlog.md/issues/386
- BACK-478 aus https://github.com/MrLesk/Backlog.md/pull/669 (kuwork's i18n, nur Web, custom React Context)

Abhängigkeiten: Keine. Sollte VOR Gantt gemacht werden (GanttView braucht t Keys).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->