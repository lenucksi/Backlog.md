---
id: BACK-0594
title: BACK-594 - Selective shadcn/ui Adoption
status: To Do
assignee: []
created_date: 2026-06-28 10:13
labels:
  - webui
  - shadcn
  - a11y
milestone: m-8
dependencies: []
priority: medium
ordinal: 364000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context

The WebUI component audit (docs/audits/webui-component-audit-2026-06.md) found that all ~25 interactive components are hand-rolled - no UI library is used. This task tracks selective adoption of shadcn/ui for the highest-ROI components: Dialog, AlertDialog, sonner (toast), and Switch.

## Scope

- shadcn init + component installation
- Replace Modal.tsx + 4 consumers with Dialog
- Replace window.confirm() with AlertDialog
- Replace SuccessToast with sonner
- Replace CSS toggle switches with Switch
- Document conventions in AGENTS.md

## References

- Audit report: docs/audits/webui-component-audit-2026-06.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All subtasks are closed or have clear path forward
- [ ] #2 bun run build completes
- [ ] #3 bun run check . passes on all touched files
- [ ] #4 bun run dev starts with HMR + API
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Init shadcn (594.1)
2. Replace Modal consumers (594.2-594.4)
3. Update AGENTS.md (594.5)
4. Verify nothing broken
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->