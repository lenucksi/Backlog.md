---
id: BACK-491.1
title: Re-audit DOC-005 Feature Parity Matrix after refactors
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 09:48'
updated_date: '2026-05-22 15:39'
labels:
  - parity
  - research
  - ci
  - documentation
milestone: m-13
dependencies:
  - BACK-516
  - BACK-515
  - BACK-492
references:
  - doc-005
parent_task_id: BACK-491
priority: medium
ordinal: 216000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

DOC-005 (Feature Parity Matrix) was created 2026-05-17 during the initial research pass. Since then, extensive parity work has been completed:

- **BACK-516** — Tool parity: CLI task complete, backlog stats, document archive/delete
- **BACK-515** — Decisions: CLI/MCP parity + supersede pattern (4 subtasks)
- **BACK-492.x** — TechDebt cluster (filter unification, routing refactor, etc.)
- **BACK-489** — Archive Documents and Decisions
- **BACK-436** — Align document management across CLI, Web UI, and MCP
- **BACK-399** — Refactor TUI filter UX parity
- **BACK-494** — Backlog-Guard
- **BACK-374** — MCP server exit on stdio close

The matrix needs re-auditing to reflect current reality.

## What

1. Re-audit ALL cells in the DOC-005 matrix (CLI / TUI / WebUI / MCP × Tasks/Drafts/Milestones/Documents/Decisions/Board/Sequences/Config/Stats)
2. Mark which ❌/⚠️ have been resolved by the refactors listed above
3. Add a "Diff since v1" section showing what changed and referencing the responsible tasks/commits
4. Update BACK-491 acceptance criteria with the current gap list
5. DOC-005 should be the source of truth — updated in-place with a version history section

## Out of scope
- BACK-491's CI enforcement implementation (that's BACK-491 proper)
- Any code changes — research + documentation only

## Expected Output
- Updated DOC-005 with current matrix + diff section + task/commit references
- Updated BACK-491 with current gap list as acceptance criteria
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Re-audited DOC-005 Feature Parity Matrix after refactors. 8 gaps resolved since v1. Updated DOC-005 to v2 with diff section, version history, and updated gap list. Updated BACK-491 with current remaining gap list for CI enforcement prioritization.
<!-- SECTION:FINAL_SUMMARY:END -->
