---
id: DRAFT-0018
title: Flexible card format with board-configurable property schema
status: Draft
assignee: []
created_date: 2026-07-04 21:02
labels:
  - architecture
  - cross-modality
milestone: Flexible Card Format
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend Backlog.md to support general kanban board use cases (not just SWE tasks) by making the card format configurable per board.

Current state: Task interface has 28 hardcoded fields. Parser, serializer, CLI, TUI, Web UI, MCP, and REST API all assume a fixed schema. Unknown YAML frontmatter keys are silently dropped.

Desired state: Board-level config defines which fields a card can have, their types (text, select, multi-select, date, checkbox, checklist, markdown, user, url, number, comments, etc.), and where they display (frontmatter inline vs body section). Cards store values in top-level YAML keys. All 5 modalities adapt to the schema.

Core challenge: reconciling schema-per-board flexibility with human+machine readable markdown files in a git repo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BACK-xxx.01: Core type system — add customFields catch-all to Task / TaskCreateInput / TaskUpdateInput, add fieldDefinitions to BacklogConfig
- [ ] #2 BACK-xxx.02: Parser/serializer — collect unknown YAML keys into customFields instead of dropping them; spread them back during serialization
- [ ] #3 BACK-xxx.03: Board config — define fieldDefinitions schema in config.yml / boards/*.yml with types, options, display hints
- [ ] #4 BACK-xxx.04: Core business logic — pass customFields through createTaskFromInput / applyTaskUpdateInput with generic diff loop
- [ ] #5 BACK-xxx.05: MCP schemas — generate dynamic JSON schema properties from fieldDefinitions in schema-generators.ts
- [ ] #6 BACK-xxx.06: REST API — handle customFields payload mapping in handleCreateTask / handleUpdateTask
- [ ] #7 BACK-xxx.07: Web UI — render dynamic property editors from fieldDefinitions in TaskDetailsModal (registry pattern)
- [ ] #8 BACK-xxx.08: TUI — display customFields in task detail popup and plain-text formatter
- [ ] #9 BACK-xxx.09: CLI wizard — dynamically render field prompts based on fieldDefinitions in task-wizard.ts
- [ ] #10 BACK-xxx.10: Multi-board routing — add optional board field to Task, designate lane-driver property per board
- [ ] #11 BACK-xxx.11: Backward compatibility — existing tasks without board field use a default board with current fixed schema, zero migration needed
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 All 11 ACs implemented and passing
- [ ] #6 All 5 modalities converge on the same fieldDefinitions (CLI, TUI, WebUI, MCP, REST)
- [ ] #7 bun test passes for existing tests + new tests for customFields round-trip
- [ ] #8 bunx tsc --noEmit passes
- [ ] #9 bun run check . passes
- [ ] #10 Existing tasks produce identical output before/after (backward compatibility verified)
<!-- DOD:END -->