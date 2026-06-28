---
id: BACK-0589
title: Milestone descriptions across all modalities
status: To Do
assignee: []
created_date: 2026-06-27 20:45
labels:
  - milestones
  - cross-modality
dependencies: []
priority: medium
ordinal: 346000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `Milestone` data model already has a `description` field (stored as `## Description` section in milestone `.md` files, parsed by `parseMilestone()`). However, descriptions are almost never displayed and cannot be edited after creation.

**Gaps found:**
- **WebUI Milestone Card**: nur `bucket.label` wird gezeigt, description fehlt
- **WebUI Add Modal**: Kein description-Textarea
- **WebUI Edit Modal**: Kein description-Edit; REST `PUT /api/milestones/:id` ignoriert description
- **CLI `milestone list`**: Kein description, auch nicht in `--json`
- **CLI Board**: Kein description
- **TUI Board**: Kein description
- **MCP `milestone_list`**: Nur `m.id: m.title`
- **MCP `milestone_rename`**: Kein description parameter
- **Filesystem**: `renameMilestone()` rewrited nur auto-generated default description; es gibt kein API um description zu setzen
- **`MilestoneBucket` type**: Hat kein `description` Feld

**REST API returns full Milestone objects** (with description) — WebUI hat die Daten bereits als `milestoneEntities` Prop, nutzt sie aber nicht für die Anzeige.

**Bekannte Files:**
- `src/types/index.ts` — Milestone, MilestoneBucket interfaces
- `src/file-system/operations.ts` — createMilestone, renameMilestone, rewriteDefaultMilestoneDescription
- `src/server/handlers/milestones.ts` — REST handlers
- `src/web/components/MilestonesPage.tsx` — WebUI milestone cards + modals
- `src/web/lib/api.ts` — API client
- `src/commands/milestone.ts` — CLI milestone list/create
- `src/commands/board.ts` — CLI board
- `src/mcp/tools/milestones/handlers.ts` — MCP handlers
- `src/mcp/tools/milestones/schemas.ts` — MCP schemas
- `src/ui/board.ts` — TUI board
- `src/web/utils/milestones.ts` — buildMilestoneBuckets
- `src/markdown/parser.ts` — parseMilestone
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Milestone description can be set/updated via filesystem API
- [ ] #2 Milestone description shown in WebUI milestone card
- [ ] #3 Milestone description editable in WebUI Add + Edit modals
- [ ] #4 Milestone description shown in MCP milestone_list output
- [ ] #5 Milestone description shown in CLI milestone list (at least in --json)
- [ ] #6 Milestone description can be updated via REST API and MCP tool
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->