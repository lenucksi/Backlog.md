---
id: BACK-552.1
title: i18n.1- i18next Infrastructure + shared core + locale config
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - infrastructure
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: high
ordinal: 288000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
i18n Infrastruktur aufsetzen.

1. i18next init: shared Instance für TUI + Web
2. src/i18n/ Struktur anlegen
3. Locale-Feld in backlog/config.yml + BacklogConfig type
4. Config-Persistenz in file-system/operations.ts
5. react-i18next Provider in App.tsx
6. i18next TypeScript Type Safety Setup (i18next-cli types oder i18next-resources-for-ts)
7. Fallback-Logik: unbekanntes Locale → EN

Lieferartefakte:
- src/i18n/i18n.ts (shared i18next instance)
- src/i18n/react.ts (react-i18next init)
- src/i18n/locales/en/translation.json + commands.json (initiale leere Dictionaries)
- src/i18n/locales/de/ (leer, später durch .3 befüllt)
- src/web/contexts/I18nProvider.tsx oder Integration in bestehenden Provider
- Locale Config in backlog.ts + types/index.ts
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->