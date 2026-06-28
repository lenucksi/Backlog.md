---
id: BACK-552.5
title: i18n.5- TUI i18n-ifizieren
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - tui
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: high
ordinal: 292000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Terminal UI Strings via shared i18next core (ohne React) übersetzen.

Anders als Web: TUI nutzt import { i18n } from '../i18n/i18n' direkt (kein React Hook).

Komponenten:
- board.ts: Spalten-Header, Labels, Statuse
- task-viewer-with-search.ts: Detail-Views, Labels
- filter-header.ts, filter-popup.ts
- generic-list.ts
- overview-tui.ts
- loading.ts, status-icon.ts
- sequences.ts
- heading.ts, code-path.ts

Namespaces: Nutzt gleiche translation.json wie Web UI (unterschiedliche Keys nur per Namespace).

Vorgehen:
1. In betroffenen Dateien: import { i18n } from '../i18n/i18n'
2. String.replace(/.../g, i18n.t('key'))
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->