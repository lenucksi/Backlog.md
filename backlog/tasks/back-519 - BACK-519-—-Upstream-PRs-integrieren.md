---
id: BACK-519
title: BACK-519 — Upstream PRs integrieren
status: To Do
assignee: []
created_date: '2026-05-22 10:24'
updated_date: '2026-05-22 11:29'
labels:
  - upstream
  - integration
milestone: m-14
dependencies: []
references:
  - 'https://github.com/MrLesk/Backlog.md/pulls'
documentation:
  - doc-6
priority: medium
ordinal: 217000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dach-Ticket für die Integration von Features aus nicht-lenucksi upstream PRs. Basierend auf DOC-006 Analyse.

## Übersicht

| Sub | Feature | PR | Aufwand |
|-----|---------|-----|---------|
| .1 | EEXIST OneDrive fix | #656 | ~15min |
| .2 | Duplicate task ID detection | #632 | 2-4h |
| .3 | Inline-code HTML escaping fix | #650 | ~30min |
| .4 | Local file preview | #634 | 3-5h |
| .5 | Paste-as-markdown | #646 | 4-6h |
| .6 | Decision MCP create/search tools | #633 (partial) | 2-4h |
| .7 | Wiki web UI (BACK-473 only) | #647 (partial) | 8-16h |

Siehe DOC-006 für detaillierte Analyse jedes PRs.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
