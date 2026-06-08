---
id: BACK-491
title: Cross-Modality CI — enforce feature parity across CLI / TUI / WebUI / MCP
  / REST
status: Done
assignee:
  - "@opencode"
created_date: 2026-05-13 10:14
updated_date: 2026-06-08 17:31
labels:
  - ci
  - testing
  - engineering-consistency
  - cli
  - tui
  - web-ui
  - mcp
  - rest-api
milestone: m-13
dependencies: []
modified_files:
  - backlog/config.yml
  - AGENTS.md
  - src/test/modality-parity.test.ts
  - .github/workflows/ci.yml
  - .codex/skills/modality-parity-check.md
priority: high
ordinal: 178000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Upstream constraint**: This task must be implemented on a clean branch from `upstream-master`. It must be self-contained and mergeable as a single standalone PR with no cross-task code dependencies. If a dependency on another task is unavoidable, it is listed explicitly in the Dependencies section.

Features have shipped in some access modalities but not others, generating upstream review comments. This task prevents that systematically by: updating the project Definition of Done, adding integration test infrastructure that verifies behavioral parity, and optionally creating a Claude skill for automated modality-coverage review.

**The 5 access modalities** that every feature must cover (or explicitly justify N/A):
1. CLI (`backlog` commands)
2. TUI (terminal UI)
3. WebUI (browser, `src/server/`)
4. MCP (MCP tool definitions)
5. REST API (`src/server/index.ts` HTTP endpoints)

**Why this matters**: In a prior implementation, access modalities were missed, generating upstream review comments and requiring follow-up PRs. The DoD and CI must catch this before code review, not after.

**Claude skill** (optional but strongly preferred): A skill file that, when invoked during code review or implementation, reads staged/changed files and flags any access modality that appears to be missing coverage for the changed feature. Skill should be invokable via `/modality-check` or equivalent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DoD updated: `backlog/config.yml` `definition_of_done` gains item: 'Feature implemented (or explicitly N/A with justification) in CLI, TUI, WebUI, MCP, and REST'
- [ ] #2 CLAUDE.md gains a 'Cross-Modality Checklist' section listing the 5 access surfaces, what 'implemented' means for each, and when N/A is acceptable
- [ ] #3 Integration test suite added (e.g. `src/__tests__/modality-parity.test.ts`) exercising a reference feature (label filtering recommended) identically through CLI execution, HTTP API call, and MCP handler invocation — asserting identical result sets
- [ ] #4 Test pattern/template documented (inline comment or `docs/` file) so contributors know how to add parity tests for new features
- [ ] #5 CI step runs parity tests on every PR (add to existing test run or separate workflow step)
- [ ] #6 Claude skill file created at `.codex/skills/modality-parity-check.md` (or `.claude/skills/`) that reviews changed files and flags missing modality coverage; instructions for when to invoke it added to CLAUDE.md
- [ ] #7 All 5 modalities named explicitly in the skill prompt so it cannot miss one by accident
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Current remaining gaps (v2 audit 2026-05-22)

After DOC-005 re-audit, these are the gaps that cross-modality CI should prioritize catching:

**High priority for CI enforcement:**
1. CLI task complete — previously ⚠️, now ✅ (BACK-516)
2. CLI decisions list/view/supersede — previously ❌, now ✅ (BACK-515)
3. CLI doc archive/delete — previously ❌, now ✅ (BACK-516)
4. MCP decisions list/view/supersede — previously ❌, now ✅ (BACK-515)
5. MCP document archive/delete — previously ❌, now ✅ (BACK-489, BACK-516)
6. CLI stats — previously ❌, now ✅ (BACK-516)

**Gaps still open and should be CI-enforced when closed:**
- TUI cannot create any entity (tasks, drafts, docs, milestones, decisions)
- Decision edit missing in CLI and MCP
- Decision create missing in MCP
- Document archive/delete missing in WebUI
- Milestone create/rename/remove missing in CLI
- Cross-branch filtering missing in MCP
- Demote to draft missing in WebUI, TUI, MCP (MCP handler exists but unregistered)
- Board/kanban missing in MCP entirely
- Statistics missing in TUI and MCP
- Sequences management missing in CLI, TUI, MCP
- TUI lacks milestone list/view

### TUI Autocomplete Gap (2026-06-08)

BACK-484 (Assignee Autocomplete + Parent Task) spezifiziert TUI-Implementierung in AC #2. Die TUI hat aktuell kein Autocomplete/Typeahead für irgendein Eingabefeld (weder Labels noch Assignee noch Parent Task).

Diese Lücke wird hier in BACK-491 als Feature-Parity-Item geführt, sobald BACK-484 WebUI abgeschlossen ist. Die konkrete TUI-Implementierung ist ein separater Subtask (zu eröffnen wenn BACK-484 WebUI done ist).

Verweis: BACK-484.1 (Parent Task), BACK-484 (Assignee) — beide haben TUI-AC, die nach WebUI-Implementierung hierher wandern.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented cross-modality CI enforcement: DoD updated with modality parity item, AGENTS.md gained Cross-Modality Checklist, src/test/modality-parity.test.ts exercises status filtering across CLI/API/MCP, CI step added to run parity tests, .codex/skills/modality-parity-check.md skill created for automated modality-coverage review.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->