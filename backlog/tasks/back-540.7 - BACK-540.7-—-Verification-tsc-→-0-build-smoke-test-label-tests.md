---
id: BACK-540.7
title: BACK-540.7 — Verification (tsc → 0, build, smoke test, label tests)
status: To Do
assignee: []
created_date: 2026-06-08 13:28
labels:
  - tech-debt
  - verification
dependencies: []
parent_task_id: BACK-540
priority: high
ordinal: 271000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 7 – Abschlussverifikation

```bash
bun run check:types    # → 0 errors expected
bun run check .         # → 0 lint errors
bun test *label*        # labels tests pass
bun run build           # binary builds
bun run cli label list  # smoke test
```

Nur wenn alles passt, ist die Phase abgeschlossen.

Abhängigkeiten: BACK-540.6
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->