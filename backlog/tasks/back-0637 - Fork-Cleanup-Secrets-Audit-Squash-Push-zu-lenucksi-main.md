---
id: BACK-0637
title: "Fork-Cleanup: Secrets-Audit + Squash + Push zu lenucksi/main"
status: To Do
assignee: []
created_date: 2026-07-12 19:42
updated_date: 2026-07-12 20:04
labels:
  - fork-cleanup
  - infra
  - security
milestone: m-21
dependencies: []
priority: high
ordinal: 438000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Kontext

Wir sind 183 Commits (seit `1576fb17`, 3. Juni 2026) vor `fork/main` (lenucksi/Backlog.md — unser Repo). Der originale upstream ist MrLesk/Backlog.md (origin, aber viel zu weit weg).

**Ziel**: Die 183 Commits auf `fork/main` pushen, aber vorher:
1. Auf Secrets/PII prüfen
2. In sinnvolle Blöcke squashen
3. MrLesk-Upstream-Attribution in Commit-Messages einbetten

**Repo-Struktur**:
- `origin` = MrLesk/Backlog.md (original upstream, outdated)
- `fork` = lenucksi/Backlog.md (unser Ziel-Repo)
- Push-Ziel: `fork/main`
- Fork-Point: `1576fb17`

**Alle 183 Commits sind von "Lenucksi" (single author). Es gibt 14 Merge-Commits und ca. 48 verschiedene BACK-Task-IDs.**

## Was bisher erarbeitet wurde

- Pre-Check auf Secrets/PII: **sauber** (nur ein harmloser Test-Fixture-String)
- 85+ MrLesk-Upstream-Referenzen (Issues/PRs) in backlog task .md files gefunden
- Squash-Strategie: ~25 thematische Gruppen, 8 davon brauchen MrLesk-Attribution (ported/cherry-picked code)
- `bun run audit:*` Scripts in `package.json` + `scripts/` geplant

## Lieferobjekte

1. Audit-Scripts (`scripts/audit-*.sh` + `package.json` Targets)
2. Finale MrLesk-Attributionsliste mit Commit-Gruppen-Zuordnung
3. Rebase-Todo-Generator-Script
4. Durchgeführter Audit (Ergebnis dokumentiert)
5. Erfolgreicher `git push fork main` mit squashten, attribuierten Commits
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit-Scripts existieren in scripts/ und package.json und sind via `bun run audit:*` aufrufbar
- [ ] #2 MrLesk-Upstream-Referenzliste ist als Notes dokumentiert und jeder Commit-Gruppe zugeordnet
- [ ] #3 Squash-Rebase wurde durchgeführt (183 → ~25 Commits)
- [ ] #4 Alle portierten/cherry-gepickten Commits haben Based-on: / Co-authored-by: Attribution-Footer
- [ ] #5 Push zu fork/main erfolgreich mit `git push fork main --force-with-lease`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

1. Subtask .01: Audit-Scripts in scripts/ + package.json anlegen
2. Subtask .02: MrLesk-Upstream-Refs aus audit:upstream Output kategorisieren und Commit-Gruppen zuordnen
3. Subtask .03: Rebase-Todo-Script mit den 25 Commit-Gruppen und Attribution-Footern bauen
4. Subtask .04: Alle Audit-Scripts ausführen, Ergebnisse dokumentieren
5. Subtask .05: Backup anlegen → Rebase mit generiertem Todo → Push zu fork/main

## Cross-Modality N/A

Dieser Task ist ein reiner Git-History-Operations-Task. Es werden keine CLI-Commands, TUI-Screens, WebUI-Komponenten, MCP-Tools oder REST-Endpoints verändert oder hinzugefügt. Sämtliche 5 Access Modalities sind N/A.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 npx aislop scan shows no new code-quality/duplicate-block warnings for changed files
- [ ] #6 No trivial restating comments added in new/changed code
- [ ] #7 react-hooks/exhaustive-deps clean for any changed React components
- [ ] #8 No leftover console.log/debug from development (distinguish from intended CLI output)
<!-- DOD:END -->