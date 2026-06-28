---
id: BACK-0586
title: Vision-Based Test Discovery PoC
status: In Progress
assignee:
  - "@jo"
created_date: 2026-06-27 11:40
labels:
  - testing
  - playwright
  - vision
  - poc
dependencies: []
priority: high
ordinal: 343000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Ziel

Validieren ob Vision-Modelle (kimi-k2.7-code) Playwright-Tests automatisiert generieren oder ergänzen können, und ob 1280×720 vs 1920×1080 einen signifikanten Unterschied macht.

## Vergleich: A vs C

- **Variante A** (`screenshot-analyzer`): Pure Vision, kein DOM-Zugriff
- **Variante C** (`screenshot-analyzer-with-chrome-devtools-mcp`): Vision + DevTools-Verifikation

Beide auf identischem Model: `opencode-go/kimi-k2.7-code`

## Test Cases (10 Screenshots)

| # | Seite/Zustand | Viewports |
|---|---|---|
| 1 | Board (3 Columns, 9 Tasks) | 1280×720, 1920×1080 |
| 2 | Board mit Assignee-Filter "bob" | 1280×720 |
| 3 | Task-Detail-Modal (geöffnet) | 1280×720 |
| 4 | Milestones Page | 1280×720 |
| 5 | Board empty state (leeres Projekt) | 1280×720 |

## Messkriterien

- Erkennungsrate: % korrekt identifizierter UI-Elemente
- Halluzinationsrate: % nicht-existierender gemeldeter Elemente
- Detailtreue: Button-Texte, Heading-Texte korrekt gelesen?
- DOM-Verifikationstreffer: Wie viele Funde aus A werden durch C widerlegt/bestätigt?
- Token-Kosten pro Analyse: Prompt + Completion Tokens

## Akzeptanzkriterien

- [ ] #1 Beide Agent-Configs auf kimi-k2.7-code aktualisiert
- [ ] #2 Worktree `tasks/back-577-vision-poc` existiert
- [ ] #3 10 Screenshots erstellt (5 Seiten × 2 Viewports)
- [ ] #4 screenshot-analyzer (A) hat alle 10 analysiert
- [ ] #5 screenshot-analyzer-with-chrome-devtools-mcp (C) hat alle 10 im dom-Modus analysiert
- [ ] #6 Vergleichstabelle erstellt
- [ ] #7 Entscheidungsempfehlung dokumentiert (lohnt sich Vision? A oder C? Welcher Viewport?)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->