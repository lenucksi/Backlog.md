---
id: BACK-0617
title: "Task-Finalization-Gate: AC/DoD-Enforcement für LLM-Agenten"
status: Deferred
assignee: []
created_date: 2026-06-29 18:58
labels:
  - architecture
  - enforcement
  - mcp
dependencies: []
references:
  - "opencode.json permission docs: https://opencode.ai/docs/permissions"
  - "opencode config schema: https://opencode.ai/config.json"
priority: low
ordinal: 407000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Outcome

Ein mechanisch erzwungenes Gate, das LLM-Agenten zwingt, alle Acceptance Criteria und Definition-of-Done-Items zu erfüllen bevor ein Task auf "Done" gesetzt werden kann. Keine Umgehungsmöglichkeit via MCP, CLI, Bash-Tricks oder direkten Datei-Edits.

## Kontext

Siehe Architecture Document `Task-Finalization-Gate: Architektur und Designentscheidungen` — enthält vollständigen Session-Verlauf, verworfene Ansätze und Begründungen.

## Key Requirements

1. `task_edit` MCP-Tool darf "Done" nicht mehr als Status akzeptieren (Schema + Handler double-lock)
2. Neues MCP-Tool `task_finalize` als einziger Weg zu "Done", mit Validierung aller ACs und DoD-Items
3. CLI `backlog task edit --status Done` blocken (opencode permission system)
4. CLI `backlog task finalize` blocken (opencode permission system) für LLM
5. Shared validation logic in `src/shared/validate-task-finalization.ts`
6. Skill `.claude/skills/task-finalization-gate/SKILL.md` mit 5x ELON Grilling
7. AGENTS.md Update mit Gate-Protokoll
8. Kein `--force` Flag, kein isTTY-Check, kein Human-Challenge
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `task_edit` MCP-Tool-Schema akzeptiert "Done" nicht mehr — Aufruf führt zu Schema-Validation-Error
- [ ] #2 `task_edit` Handler blockt terminale Status zusätzlich per double-lock
- [ ] #3 `task_finalize` MCP-Tool existiert und validiert alle ACs und DoD-Items
- [ ] #4 `task_finalize` setzt Status nur auf Done wenn alle ACs + DoDs gehakt sind
- [ ] #5 `opencode.json` blockt `backlog task finalize*` und `backlog task edit *--status*` per permission.bash
- [ ] #6 CLI `backlog task edit` handler blockt auch `--status Done`
- [ ] #7 `validate-task-finalization.ts` shared module existiert mit Parse+Check-Logik
- [ ] #8 Skill `task-finalization-gate` mit 5 Runden ELON Grilling existiert
- [ ] #9 AGENTS.md enthält Gate-Protokoll mit Verbot von direktem task_edit(status: Done)
- [ ] #10 Kein `--force` Flag, kein isTTY-Check, kein Human-Challenge implementiert
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 Alle 5 Zugriffsmodi bedacht: MCP (task_finalize tool), CLI (blockiert per permission), TUI (N/A), WebUI (N/A), REST (N/A)
<!-- DOD:END -->