---
id: BACK-552.2
title: i18n.2- EN Dictionary (alle Web + TUI + CLI Strings)
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - dictionary
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: high
ordinal: 289000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Englische Translation Namespaces für alle Komponenten.

Scope: Alle UI-Strings in Web UI (Board, TaskDetails, Sidebar, Milestones, Settings, Statistics, Wiki, Decisions, Documents, Drafts) + TUI (Board, TaskViewer, Filter, Overview, Sequences) + CLI (Commands, Outputs).

Namespaces:
- translation.json: Web UI + TUI Strings
- commands.json: CLI command descriptions + Outputs

Vorgehen:
- Alle Komponenten nach hardcoded Strings durchsuchen
- In EN Dictionaries erfassen (i18next JSON Format, flache oder nested Keys)
- Kuworks en.ts aus PR #669 als Inspiration/Extraktionsquelle (25KB, 42 Sections)

Upstream Referenz: src/web/locales/en.ts aus kuwork/Backlog.md@tasks/combined-208-505

Lieferartefakte:
- src/i18n/locales/en/translation.json
- src/i18n/locales/en/commands.json
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->