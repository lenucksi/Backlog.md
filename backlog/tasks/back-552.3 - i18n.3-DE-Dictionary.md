---
id: BACK-552.3
title: i18n.3- DE Dictionary
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - dictionary
  - de
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: high
ordinal: 290000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deutsche Übersetzung aller i18n Namespaces.

Vorgehen:
- Kopie von EN → DE Dictionaries
- Manuelle Übersetzung aller Keys
- Review durch native German speaker
- Keys müssen 1:1 mit EN Dictionary matchen (Shape-Check via Type Safety)

Kann initial manuell gemacht werden und später über Weblate/Crowdin von der Community gepflegt werden.

Lieferartefakte:
- src/i18n/locales/de/translation.json
- src/i18n/locales/de/commands.json
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->