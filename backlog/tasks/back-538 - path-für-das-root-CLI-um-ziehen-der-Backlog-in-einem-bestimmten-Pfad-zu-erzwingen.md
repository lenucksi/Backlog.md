---
id: BACK-538
title: --path für das root CLI um ziehen der Backlog in einem bestimmten Pfad zu
  erzwingen
status: To Do
assignee: []
created_date: 2026-06-03 10:17
labels: []
dependencies: []
priority: high
ordinal: 262000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
backlog --path ~/pfadmitbacklogordner doc update ....

usw sollen funktionieren. das soll im root von backlog cli liegen damit es für jedes kommando ausgeführt wernde kann.

muss dann natürlcih auch in der --help dokumentiert sein.

und mit TUI/MCP/WEBUI funktinoeren. Könnte für MCP auch sehr nützlich sein.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->