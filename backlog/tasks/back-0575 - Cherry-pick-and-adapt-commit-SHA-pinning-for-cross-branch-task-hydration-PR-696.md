---
id: BACK-0575
title: "Cherry-pick and adapt commit-SHA pinning for cross-branch task hydration
  (PR #696)"
status: Done
assignee: []
created_date: 2026-06-26 17:33
updated_date: 2026-06-26 23:00
labels:
  - upstream
  - bug
  - core
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/pull/696
priority: high
ordinal: 327000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/pull/696 — Fix cross-branch task hydration dropping tasks when a branch moves (commit-SHA pinning)

## What this is
Cross-branch task loading verwendet einen Two-Phase-Ansatz: (1) Index wird pro Branch mit `git ls-tree` gebaut, (2) Winner-Tasks werden später mit `git show <branch>:<path>` hydriert. Wenn ein Branch zwischen Index und Hydrate gelöscht/umbenannt wird, löst der Branch-Ref nicht mehr auf, der `git show` schlägt fehl, und die Tasks werden stillschweigend verworfen.

**Upstream-Fix**: Branch-Tip zum Index-Zeitpunkt auf den immutable Commit-SHA pinnen, Hydrate vom SHA statt vom Branch-Namen.

## Unsere Codebasis hat DENSELBEN BUG
- `src/core/task-loader.ts`: `runIndexWorkers` (shared), `hydrateTasks`, `findTaskInRemoteBranches`, `findTaskInLocalBranches`
- `src/git/operations.ts`: kein `resolveCommit()` vorhanden
- `src/test/local-branch-tasks.test.ts`: existiert mit Basis-Tests

Unsere Architektur ist sogar **einfacher zu patchen** als Upstreams: wo Upstream duplizierten Code in `buildRemoteTaskIndex` + `buildLocalBranchTaskIndex` patchen muss, patchen wir einmal die shared `runIndexWorkers`.

## Upstream PR #696
OPEN PR, +161/-18, 3 Files: `src/core/task-loader.ts`, `src/git/operations.ts`, `src/test/local-branch-tasks.test.ts`
Änderungen:
1. `GitOperations.resolveCommit(ref)` — `git rev-parse --verify --quiet <ref>^{commit}`
2. `RemoteIndexEntry` bekommt `commit?: string`
3. Indexing resolved SHA einmal pro Branch, speichert auf jedem Entry
4. Hydration nutzt `commit ?? ref` (fallback für backward compat)
5. `findTaskInRemoteBranches` / `findTaskInLocalBranches` gleiches Pattern
6. Tests für Branch-deletion-between-indexing-and-hydration + fallback

## Implementation Plan (angepasst an unsere Architektur)

### File 1: `src/git/operations.ts` — Clean Cherry-Pick
- `resolveCommit(ref)` Methode hinzufügen (ca. 10 Zeilen)
- Selbst-contained, keine Dependencies auf andere Änderungen

### File 2: `src/core/task-loader.ts` — Adaptieren (simpler als Upstream)
- `commit?: string` zu `RemoteIndexEntry` (ab ~line 58)
- `resolveCommitSafe` helper (module-level)
- In `runIndexWorkers` (nach `const ref = getRef(br)`): SHA resolven + auf jedem Entry speichern
- `hydrateTasks`: `w.commit ?? w.ref` statt `w.ref`
- Winner-Konstruktion (5 Stellen): `commit: best.commit`
- `findTaskInRemoteBranches`: `best.commit ?? ref` statt `ref`
- `findTaskInLocalBranches`: `best.commit ?? best.branch` statt `best.branch`

### File 3: `src/test/local-branch-tasks.test.ts` — 2 neue Tests
- Test: Branch gelöscht zwischen Index+Hydrate → Task via SHA trotzdem geladen
- Test: `resolveCommit` nicht verfügbar → Fallback zu Branch-Name (keine Regression)

## Complexity
**NIEDRIG** (~45 min). Rein mechanische Änderungen: optionales Feld durch bestehende Datenstrukturen fädeln + eine Git-Methode. Sauberer Fallback, kein Risiko.

## Test plan
- `bun test src/test/local-branch-tasks.test.ts` — 2 neue + 9 bestehende Tests passen
- `bun test src/test/parallel-loading.test.ts src/test/find-task-in-branches.test.ts`
- Real-git Reproduktion: Branch erstellen, SHA captured, Branch löschen, `git show <branch>` fail vs `git show <sha>` success
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 cross-branch task loading resolved commit SHA once per branch at index time
- [x] #2 hydrateTasks uses pinned SHA (falling back to branch name when unavailable)
- [x] #3 findTaskInRemoteBranches uses pinned SHA
- [x] #4 findTaskInLocalBranches uses pinned SHA
- [x] #5 Branch deletion between indexing and hydration no longer drops tasks
- [x] #6 resolveCommit unavailable → falls back to branch name (backward compatible)
- [x] #7 task.branch still shows readable branch name (not the SHA)
- [x] #8 bunx tsc --noEmit passes, bun run check . passes, bun test passes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
`resolveCommit(ref)` added to GitOperations — uses `git rev-parse --verify --quiet <ref>^{commit}`

`commit?: string` added to `RemoteIndexEntry`

`runIndexWorkers` resolves SHA once per branch, stores on each entry

`hydrateTasks` uses `w.commit ?? w.ref` as effective ref

`findTaskInRemoteBranches` and `findTaskInLocalBranches` use `best.commit ?? ref/branch`

All winner construction sites pass commit through

Mock GitOperations in 2 test files updated with `resolveCommit`

tsc+biome clean, 149 tests pass across 5 relevant test files
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [x] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->