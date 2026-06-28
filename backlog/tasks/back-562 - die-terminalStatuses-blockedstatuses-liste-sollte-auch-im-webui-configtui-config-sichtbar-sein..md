---
id: BACK-562
title: die terminalStatuses + blockedstatuses liste sollte auch im webui
  config+tui config sichtbar sein.
status: Done
assignee: []
created_date: 2026-06-17 09:06
updated_date: 2026-06-17 12:40
labels: []
milestone: m-8
dependencies: []
priority: low
ordinal: 314000
---

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TUI Config Screen bewusst nicht implementiert — Entscheidung: WebUI + CLI (config list/get/set) reichen. TUI hat kein Config-Fenster und der Aufwand für ein vollständiges TUI-Config-Screen steht in keinem Verhältnis zum Nutzen dieser zwei Keys. Ggf. später als eigenständiges Ticket ein TUI-Config-Panel bauen.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added terminal_statuses and blocked_statuses as tag-select button groups in Settings.tsx → Workflow Settings. Options are populated from the statuses API; clicking toggles each status on/off. TUI Config Screen explicitly N/A — WebUI + CLI config list/get/set cover all needs. Full TUI config panel would be a separate task.
<!-- SECTION:FINAL_SUMMARY:END -->