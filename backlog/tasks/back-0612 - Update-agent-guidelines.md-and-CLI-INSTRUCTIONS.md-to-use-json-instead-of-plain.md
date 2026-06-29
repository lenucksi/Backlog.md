---
id: BACK-0612
title: Update agent-guidelines.md and CLI-INSTRUCTIONS.md to use --json instead
  of --plain
status: Done
assignee: []
created_date: 2026-06-29 14:12
updated_date: 2026-06-29 14:16
completed_date: 2026-06-29 14:16
labels:
  - docs
dependencies: []
modified_files:
  - src/guidelines/agent-guidelines.md
  - CLI-INSTRUCTIONS.md
ordinal: 402000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Both documents reference `--plain` for LLM-friendly output. All commands now support `--json` which is easier for LLMs to parse (structured JSON vs text parsing). Update all references:

**agent-guidelines.md:**
- All `backlog ... --plain` examples → `backlog ... --json`
- The task structure reference and CLI reference tables
- Section 8 (Search) examples
- Quick reference tables in section 9

**CLI-INSTRUCTIONS.md:**
- `backlog task list --plain` → `backlog task list --json`
- All `--plain` examples in task management section
- Search section: `--plain` → `--json`
- Update description text from "plain text" to "JSON output"
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced all `--plain` references with `--json` in CLI-INSTRUCTIONS.md (2 occurrences) and agent-guidelines.md (26 occurrences). Updated descriptive text from "plain text / AI-friendly text output" to "JSON output / structured JSON output" to match the new flag behavior.
<!-- SECTION:FINAL_SUMMARY:END -->