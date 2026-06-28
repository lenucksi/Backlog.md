---
id: DRAFT-16
title: "Spike: Support multiple task ID prefixes per project"
status: Draft
assignee: []
created_date: 2026-06-17 10:39
labels:
  - upstream
  - spike
milestone: "m-14: Upstream Integration"
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/642
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/642 — [Feature]: Support multiple task ID prefixes per project (per-feature / per-epic namespaces)

## What this is
DRAFT / SPIKE — exploration and architectural assessment. The idea is to support multiple task ID namespaces within one project, each with its own counter, e.g. `AGENTAUD-1` alongside `INDEPENDENCE-1` alongside the default `TASK-1`.

Proposed config schema:
```yaml
# backlog/config.yml
task_prefixes:
  - prefix: TASK
    default: true
  - prefix: AGENTAUD
  - prefix: INDEPENDENCE
```

And a `--prefix` flag on creation: `backlog task create "Audit auth flow" --prefix AGENTAUD`

## What to explore
This touches EVERYWHERE that assumes a single prefix:
- **ID generation**: per-prefix counters in `sequences/` dir
- **ID normalization**: all lookups must check all prefixes
- **Config schema**: `task_prefixes[]` vs `task_prefix` (backwards compat)
- **CLI**: `--prefix` flag on `task create`
- **Web UI**: prefix picker/input in create modal
- **MCP**: `prefix` arg in `task_create` tool
- **TUI**: prefix display in board cards
- **Dependency resolution**: cross-prefix deps (`AGENTAUD-3` → `INDEPENDENCE-12`)
- **Archival / completion**: archival of tasks from any prefix
- **Cross-branch check**: scanning for tasks by ALL configured prefixes
- **Task list / search / filter**: filtering by prefix

## Complexity
VERY HIGH — this is a foundational architectural change. The entire ID system assumes a single global counter. Every subsystem listed above needs modification.

## Deliverable
A document (not implementation) analyzing:
- Architectural impact across all subsystems
- Migration path for existing single-prefix projects
- Backwards compatibility strategy
- Whether this is worth the complexity or if labels/tags are sufficient
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->