---
id: BACK-518
title: Upstream PR Analysis — evaluate non-lenucksi open PRs for usability/merit
status: Done
assignee:
  - '@opencode'
created_date: '2026-05-22 09:47'
updated_date: '2026-05-22 09:58'
labels:
  - research
  - upstream
  - integration
  - planning
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pulls'
priority: medium
ordinal: 215000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

There are 12 open PRs on the upstream repo (MrLesk/Backlog.md) by non-lenucksi authors. All were written against the pre-refactored codebase. We need to evaluate:

1. Whether the code is directly usable despite our refactoring
2. If not, whether the idea has enough merit to implement independently
3. What effort would be required

## PRs to analyze

### kuwork PRs (known to be "maximal messy+vermischt")
- #650 — BACK-476: Fix inline-code HTML escaping in markdown renderer
- #648 — BACK-475: Add Word (docx) upload for image extraction
- #647 — Wiki web UI with file tree nav, wiki install command (mixed: BACK-473/474/477)
- #646 — BACK-208: Add paste-as-markdown support in Web UI
- #634 — BACK-467: Add local file preview with syntax highlighting

### Others
- #656 — GregoryFerraz: fix EEXIST on Windows OneDrive (Bun bug)
- #645 — raincrossgazette: ordinal as sortable column in list view
- #644 — raincrossgazette: sort milestones ascending by ID
- #633 — abbyssoul: Decision Management CLI commands and MCP Tools
- #632 — brooksc: BACK-465: Detect and warn about duplicate task IDs
- #550 — maeste: configurable tasksDirectory for custom task storage
- #361 — TASK-270: Prevent command substitution in task creation inputs

## Method per PR

1. Fetch the PR branch
2. Look at changed files — do they touch refactored areas?
3. Assess if code is cherry-pickable or needs adaptation
4. If code is unusable: does the feature idea have standalone merit?
5. Estimate effort to implement from scratch in current codebase

## Output
- Backlog document (DOC-006) with PR analysis matrix
- For each PR: verdict, rationale, effort estimate
- Disentangled kuwork feature proposals
- Recommended implementation tickets
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #11 Analyze all non-lenucksi open PRs on MrLesk/Backlog.md
- [ ] #2 #12 For each PR: can code be used directly after our refactoring? (yes/no/partially)
- [ ] #3 #13 For each PR: does the idea have enough merit for independent implementation? (yes/no) with rationale
- [ ] #4 #14 For each PR: effort estimate (low/medium/high) for bringing the feature in
- [ ] #5 #15 kuwork PRs (#647, #646, #648, #650, #634) disentangled into individual feature proposals
- [ ] #6 #16 Output: backlog document with PR matrix + recommendations + suggested implementation tickets
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
