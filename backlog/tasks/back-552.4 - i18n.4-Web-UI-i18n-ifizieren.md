---
id: BACK-552.4
title: i18n.4- Web UI i18n-ifizieren
status: To Do
assignee: []
created_date: 2026-06-09 12:38
labels:
  - i18n
  - web
milestone: m-14
dependencies: []
parent_task_id: BACK-552
priority: high
ordinal: 291000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Alle hardcoded UI-Strings in Web-Komponenten durch i18next useTranslation() Hook + t() ersetzen.

Komponenten (ca. 30+):
- Board.tsx, TaskColumn.tsx, TaskCard.tsx
- TaskDetailsModal.tsx (~1100+ lines)
- TaskList.tsx
- SideNavigation.tsx
- MilestonesPage.tsx
- Settings.tsx
- Statistics.tsx
- WikiDetail.tsx
- DocumentationDetail.tsx, DecisionDetail.tsx
- DraftsList.tsx, CleanupModal.tsx
- Layout.tsx, Header.tsx
- MermaidMarkdown.tsx, FilePreviewModal.tsx
- LabelFilterDropdown.tsx, ChipInput.tsx, DependencyInput.tsx
- GanttView.tsx (wenn bereits vorhanden)
- Alle Übersetzungs-Komponenten aus locales/en.ts aus PR #669

Vorgehen pro Komponente:
1. import { useTranslation } from 'react-i18next'
2. const { t } = useTranslation('translation')
3. "Loading..." → t('common.loading')
4. Template-Strings: `Remove ${item}` → t('common.removeItem', { item })
5. Keyboard-Shortcuts/Label-Attribute ebenfalls übersetzen

Hinweis: Mechanische Arbeit, aber wichtig für Vollständigkeit. Pro Komponente ca. 5-30 Minuten.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->