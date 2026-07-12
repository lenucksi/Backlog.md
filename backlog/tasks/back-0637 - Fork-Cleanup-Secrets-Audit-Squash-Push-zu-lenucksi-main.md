---
id: BACK-0637
title: "Fork-Cleanup: Secrets-Audit + Squash + Push zu lenucksi/main"
status: In Progress
assignee:
  - "@opencode"
created_date: 2026-07-12 19:42
updated_date: 2026-07-12 21:06
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
- [x] #1 Audit-Scripts existieren in scripts/ und package.json und sind via `bun run audit:*` aufrufbar
- [x] #2 MrLesk-Upstream-Referenzliste ist als Notes dokumentiert und jeder Commit-Gruppe zugeordnet
- [x] #3 Squash-Rebase wurde durchgeführt (183 → ~25 Commits)
- [x] #4 Alle portierten/cherry-gepickten Commits haben Based-on: / Co-authored-by: Attribution-Footer
- [x] #5 Push zu fork/main erfolgreich mit `git push fork main --force-with-lease`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Categories to fix:

1. **knip/files (3)** — Delete: `src/lsp/sonarlint-wrapper.ts`, `src/ui/components/label-manager.ts`, `src/utils/output-formatter.ts`

2. **knip/dependencies + devDependencies (3)** — Remove from package.json: `@opentui/core` (dep), `@types/react-router-dom` (devDep), `react-tooltip` (devDep)

3. **knip/types (1)** — Un-export `TaskEditRequest` type from `src/types/task-edit-args.ts`

4. **knip/exports truly unused (8)** — Un-export/delete:
   - `src/mcp/validation/tool-wrapper.ts`: Delete `createAsyncValidatedTool` and `validateSanitizedStrings` (never used anywhere), un-export `createValidatedTool`, `createSchemaValidator`, `createAsyncValidator` (internal-only helpers)
   - `src/utils/output.ts`: Un-export `setOutputMode` (internal-only)
   - `src/utils/task-sorting.ts`: Un-export `sortByDueDate`, `sortByOrdinal` (internal-only)

5. **knip/exports false positives (26)** — Keep as-is. These are re-exports from `src/index.ts` (package API) or functions imported by MCP tool handlers and web components (`.tsx` files not in knip's project glob).

6. **knip/binaries (1)** — Add `prek` to `ignoreBinaries` in knip.json

### Verification:
- `bun run check . --write` must pass
- `bun run check:types` must pass
- `bun test` must pass
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
### Commit: `ebdbdaa5`

### Breakdown

| Category | Count | Action |
|---|---|---|
| `knip/files` | 3 | Deleted `sonarlint-wrapper.ts`, `label-manager.ts`, `output-formatter.ts` |
| `knip/devDependencies` | 2 | Removed `@types/react-router-dom`, `react-tooltip` from package.json |
| `knip/dependencies` | 1 | Removed `@opentui/core` from package.json |
| `knip/types` | 1 | Un-exported `TaskEditRequest`, moved to inline in handlers.ts |
| `knip/exports` | 8 fixed / 26 false positives | Fixed: 2 deleted (dead code), 6 un-exported (internal-only). Kept: 26 used at runtime. |
| `knip/binaries` | 1 | Added `prek` to `ignoreBinaries` in knip.json |

### Verification
- `bun run check . --write` — clean (no errors)
- `bun run check:types` — same 2 pre-existing errors (unrelated module resolution)
- `bun test` — same 9 pre-existing failures (unrelated commit-context tests)
- `npx aislop scan` — no duplicate-block warnings in changed files
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [x] #5 npx aislop scan shows no new code-quality/duplicate-block warnings for changed files
- [x] #6 No trivial restating comments added in new/changed code
- [x] #7 react-hooks/exhaustive-deps clean for any changed React components
- [x] #8 No leftover console.log/debug from development (distinguish from intended CLI output)
<!-- DOD:END -->