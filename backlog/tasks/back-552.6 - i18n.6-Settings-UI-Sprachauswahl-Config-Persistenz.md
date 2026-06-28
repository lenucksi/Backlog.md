---
id: BACK-552.6
title: i18n.6- Settings-UI Sprachauswahl + Config-Persistenz
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - web
  - settings
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: medium
ordinal: 293000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Locale-Umschalter in der Web UI Settings-Seite.

Features:
- Dropdown/Select für verfügbare Sprachen (DE, EN, später mehr)
- onChange: locale setzen + in config.yml persistieren + UI neu rendern
- Config-Endpunkt: GET/PUT /api/config/locale
- CLI: backlog config set locale de (optional)

Lieferartefakte:
- Settings.tsx: Language-Selection Component
- server/index.ts: locale Config-Endpoint
- i18n/react.ts: changeLanguage-Handler bei Config-Änderung
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->