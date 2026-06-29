---
id: BACK-0614
title: "Init-Wizard UX: web-browser prompt, blocked-default fix, keyboard-nav"
status: Done
assignee: []
created_date: 2026-06-29 15:00
updated_date: 2026-06-29 15:03
labels:
  - ux
  - init
  - web-ui
dependencies: []
references:
  - "15b2743 fix(init): BACK-614 - Init-Wizard UX"
modified_files:
  - src/commands/browser.ts
  - src/commands/advanced-config-wizard.ts
  - src/web/components/InitializationScreen.tsx
priority: medium
ordinal: 404000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three UX improvements to the initialization flow:

1. **`backlog browser` prompts for web init wizard when no project found**  
   Instead of just showing an error and exiting, the CLI now asks the user if they want to open the web initialization wizard. If yes, the server starts anyway and the web UI shows the `InitializationScreen` component.

2. **Blocked status default should not include `Deferred`**  
   The advanced config wizard's blocked-status prompt used to load its `initialValue` from the existing config (`blockedStatuses?.join(", ")`), which could contain stale values like `Deferred`. Now it always uses the freshly computed smart default (`blockedDefault` = only statuses containing "block").

3. **Web init wizard keyboard navigation**  
   The web initialization wizard (`InitializationScreen.tsx`) now supports Enter key to advance to the next step (or initialize on the summary step). Text/number inputs in the advanced config step are excluded to avoid accidental navigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `backlog browser` in non-initialized dir shows clack prompt asking to open web wizard
- [x] #2 Blocked status default in advanced config wizard is always `Blocked` (never `Blocked, Deferred`)
- [x] #3 Enter key advances to next step in web init wizard (project name → integration → etc.)
- [x] #4 Text/number inputs in advanced config step don't trigger navigation on Enter
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->