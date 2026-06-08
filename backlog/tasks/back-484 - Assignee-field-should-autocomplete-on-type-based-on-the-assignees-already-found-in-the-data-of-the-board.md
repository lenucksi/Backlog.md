---
id: BACK-484
title: Assignee field should autocomplete-on-type based on the assignees already
  found in the data of the board
status: In Progress
assignee:
  - "@jo"
created_date: 2026-05-13 09:51
updated_date: 2026-06-08 17:30
labels: []
milestone: m-8
dependencies: []
references:
  - src/web/components/ChipInput.tsx
  - src/web/components/TaskDetailsModal.tsx
  - src/web/components/DependencyInput.tsx
  - BACK-491 — Cross-Modality CI (TUI Autocomplete dependency)
priority: medium
ordinal: 171000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Upstream constraint**: This task must be implemented on a clean branch from `upstream-master`. It must be self-contained and mergeable as a single standalone PR with no cross-task code dependencies. If a dependency on another task is unavoidable, it is listed explicitly in the Dependencies section.

The assignee field in task create/edit should offer typeahead suggestions from assignees that already appear anywhere in the board's task files. No central config — the system scrapes assignees from existing task frontmatter at query time.

This is the assignee equivalent of label autocomplete (see label management ticket) but intentionally simpler: no CRUD, no management UI, just dynamic scraping. The `@`-prefix convention is preserved throughout.

**How scraping works**: At autocomplete query time, scan all task files in `backlog/tasks/` and collect distinct values from the `assignee:` frontmatter field. Return deduplicated, sorted list. No caching required (board is local files; scan is fast enough for interactive use).
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WebUI: assignee input in task create/edit shows dropdown of existing assignees after 1+ characters typed; matching case-insensitive; free entry still allowed
- [ ] #2 WebUI: parent task input in task create/edit shows task search dropdown (ID + title) after 1+ characters; single-select via ChipInput
- [ ] #3 DependencyInput: ArrowDown/ArrowUp scrollDropdown synchron mit Auswahl; stopPropagation verhindert Seiten-Scroll
- [ ] #4 Scraped assignee list from task frontmatter at query time (availableTasks) — keine config, kein Cache
- [ ] #5 TUI autocomplete assigned to BACK-491 (Feature Parity) for later implementation
- [ ] #6 All 5 modalities covered or explicitly N/A with justification
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Scope: WebUI Autocomplete für Assignee + Parent Task

**Datenquelle**: `availableTasks` (bereits via `apiClient.fetchTasks()` in TaskDetailsModal geladen, Zeile 325) liefert alle Tasks. Assignees und Task-IDs/-Titel werden daraus extrahiert — kein zusätzlicher API-Call nötig.

### Phase 1 — ChipInput singleSelect-Modus
- Neue Prop `singleSelect?: boolean`
- Wenn true: max 1 Chip, kein Multi-Add, Enter/Comma wählt Vorschlag und schließt
- Notwendig für Parent-Task-Feld (Single-Value)

### Phase 2 — Assignee Autocomplete
- `availableAssignees` aus `availableTasks` extrahieren (useMemo, flatMap + Set)
- Assignee-ChipInput erhält `suggestions={availableAssignees}`
- BACK-484 #1 WebUI ✅

### Phase 3 — Parent Task Autocomplete
- Plain `<input>` ersetzen durch ChipInput mit `singleSelect`
- `parentTaskSuggestions` aus `availableTasks` (format: "BACK-123 - Task Title")
- Bei Auswahl: `parentTaskId = selectedTask.id`
- Bestehende onBlur-Logik erhalten

### Phase 4 — DependencyInput Scroll-Fix
- `stopPropagation()` auf ArrowDown/ArrowUp
- `scrollIntoView`-useEffect auf `selectedIndex`

### Ausgeschlossen (BACK-491)
- TUI Autocomplete (wird via BACK-491 Feature Parity adressiert)
- CLI Autocomplete
- MCP Autocomplete
<!-- SECTION:PLAN:END -->