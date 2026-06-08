# Label Consolidation Proposals

Goal: Reduce from 136 to <75 labels by merging single-use or overlapping labels into broader existing ones.

## Merge Map

| Remove | Into | Count | Reason |
|--------|------|-------|--------|
| `agent`, `agent-guidelines`, `agent-skills` | `agents` | 3 | Subtypen |
| `board`, `kanban` | `web-ui` | 2 | Web-UI-Features |
| `browser` | `web` | 1 | Gleicher Kontext |
| `content-viewer`, `design`, `editor`, `search`, `task-view`, `visualization` | `web-ui` | 6 | Web-UI-Features |
| `ui` | `web-ui` | 1 | Plural |
| `commands`, `completions`, `json`, `powershell` | `cli` | 4 | CLI-Subfeatures |
| `bun-pty`, `vterm`, `renderer` | `termless` | 3 | TUI-Infrastruktur |
| `concurrency`, `data-integrity`, `networking`, `state`, `serialization`, `parser`, `model`, `architecture` | `core` | 8 | Technische Details |
| `dry` | `refactoring` | 1 | Gleiche Kategorie |
| `duplicate`, `breaking`, `papercut` | `bug` | 3 | Fehler-Kategorien |
| `hooks`, `pre-commit`, `prek` | `tooling` | 3 | Entwickler-Tools |
| `build` | `ci` | 1 | CI/CD |
| `distribution`, `macos`, `windows`, `docker`, `release` | `packaging` | 5 | Plattform/Release |
| `integration` | `mcp` | 1 | Zu generisch |
| `go` | `forge-integration` | 1 | Implementierungsdetail |
| `schema` | `forge-schema` | 1 | Bereits konsolidiert |
| `phase-1` bis `phase-5` | `tech-debt` | 5 | Arbeitsphasen |
| `planning`, `strategy` | `research` | 2 | Planung ≠ Ticket |
| `tdd`, `validation`, `performance` | `testing` | 3 | Test-Subkategorien |
| `specification` | `doc` | 1 | Dokumentation |
| `terminal-status`, `blocked-status`, `xdg` | `config` | 3 | Config-Details |
| `archive` | `cleanup` | 1 | Gleicher Workflow |
| `autocomplete` | `ux` | 1 | UX-Feature |
| `all-modalities` | `parity` | 1 | Metathema |
| `color`, `crud` | `labels` | 2 | Label-Management |
| `contribution`, `open-source`, `fork` | `community` | 3 | Community |
| `cursor`, `dx` | `developer-experience` | 2 | DX |
| `demote` | `drafts` | 1 | Draft-Workflow |
| `quick-win` | `fix` | 1 | Priority ≠ Label |
| `consistency` | `engineering-consistency` | 1 | Abkürzung |

**Total removals: 69**
**Result: 136 - 69 = 67 labels** ✅ (target <75)

## Keep (distinct concepts)

`web-ui`, `cli`, `bug`, `enhancement`, `mcp`, `tui`, `tech-debt`, `testing`, `feature`, `refactoring`, `web`, `upstream`, `ux`, `doc`, `parity`, `research`, `coverage`, `forge-integration`, `core`, `decisions`, `documentation`, `milestones`, `filters`, `ci`, `sequences`, `termless`, `fix`, `subtasks`, `forgejo`, `frontend`, `config`, `labels`, `cleanup`, `analysis`, `forge-schema`, `typescript`, `git`, `markdown`, `tooling`, `api`, `git-hygiene`, `statistics`, `dependencies`, `engineering-consistency`, `server`, `developer-experience`, `init`, `packaging`, `security`, `community`, `agents`, `prefix-config`, `quality`, `tasks`, `workflow`, `infrastructure`, `cross-branch`, `drafts`, `rest-api`, `bugfix`, `authors`, `color`, `go`, `schema`, `definition-of-done`

## Execution

Use `scripts/label-cleanup.sh` — add a Phase 6 with the remaining merges.
Run with: `bash scripts/label-cleanup.sh --apply`
