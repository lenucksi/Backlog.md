# CLI Reference

Full command reference for Backlog.md. For getting started, see [README.md](README.md).

## Project Setup

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Initialize project | `backlog init [project-name]` (creates backlog structure with a minimal interactive flow) |
| Re-initialize | `backlog init` (preserves existing config, allows updates) |
| Advanced settings wizard | `backlog config` (no args) — launches the full interactive configuration flow |

`backlog init` keeps first-run setup focused on the essentials:
- **Project name** – identifier for your backlog (defaults to the current directory on re-run).
- **Backlog folder** – choose `backlog/`, `.backlog/`, or a custom project-relative path.
- **Config location** – for built-in folders, choose folder-local `config.yml` or root `backlog.config.yml`; custom paths use root `backlog.config.yml`.
- **Integration choice** – decide whether your AI tools connect through the **MCP connector** (recommended) or stick with **CLI commands (legacy)**.
- **Instruction files (CLI path only)** – when you choose the legacy CLI flow, pick which instruction files to create (CLAUDE.md, AGENTS.md, GEMINI.md, Copilot, or skip).
- **Advanced settings prompt** – default answer "No" finishes init immediately; choosing "Yes" jumps straight into the advanced wizard documented in [ADVANCED-CONFIG.md](ADVANCED-CONFIG.md).

The advanced wizard includes interactive Definition of Done defaults editing (add/remove/reorder/clear), so project checklist defaults can be managed without manual YAML edits.

You can rerun the wizard anytime with `backlog config`. All existing CLI flags (for example `--defaults`, `--agent-instructions`) continue to provide fully non-interactive setups, and init also supports `--backlog-dir <path>` plus `--config-location <folder|root>` for scripted configuration.

## Documentation

- Document IDs are global across all subdirectories under `backlog/docs`. You can organize files in nested folders (e.g., `backlog/docs/guides/`), and `backlog doc list` and `backlog doc view <id>` work across the entire tree.
- Use `backlog doc create "New Guide" -p guides` to create a document in a docs subdirectory. The created output includes the persisted docs-relative file path, such as `backlog/docs/guides/doc-1 - New-Guide.md`.
- Use `backlog doc update doc-1 --content "Updated markdown"` to update document content. Add `--title`, `-t/--type`, `--tags`, or `-p/--path` to update metadata or move the document while preserving omitted fields.
- Document paths are always relative to the docs directory. Absolute paths and traversal segments such as `..` are rejected.

## Task Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Create task | `backlog task create "Add OAuth System"`                    |
| Create with description | `backlog task create "Feature" -d "Add authentication system"` |
| Create with assignee | `backlog task create "Feature" -a @sara`           |
| Create with status | `backlog task create "Feature" -s "In Progress"`    |
| Create with labels | `backlog task create "Feature" -l auth,backend`     |
| Create with priority | `backlog task create "Feature" --priority high`     |
| Create with plan | `backlog task create "Feature" --plan "1. Research\n2. Implement"`     |
| Create with AC | `backlog task create "Feature" --ac "Must work,Must be tested"` |
| Add DoD items on create | `backlog task create "Feature" --dod "Run tests"` |
| Create without DoD defaults | `backlog task create "Feature" --no-dod-defaults` |
| Create with notes | `backlog task create "Feature" --notes "Started initial research"` |
| Create with final summary | `backlog task create "Feature" --final-summary "PR-style summary"` |
| Create with deps | `backlog task create "Feature" --dep task-1,task-2` |
| Create with refs | `backlog task create "Feature" --ref https://docs.example.com --ref src/api.ts` |
| Create with docs | `backlog task create "Feature" --doc https://design-docs.example.com --doc docs/spec.md` |
| Create sub task | `backlog task create -p 14 "Add Login with Google"`|
| Create with due date | `backlog task create "Feature" --due-date "2026-07-15"` |
| Create with defer date | `backlog task create "Feature" --defer-date "2026-07-01"` |
| Create with milestone | `backlog task create "Feature" --milestone "v2.0"` |
| Create with ordinal | `backlog task create "Feature" --ordinal 1500` |
| Create with modified files | `backlog task create "Feature" --modified-file src/api.ts --modified-file src/ui.ts` |
| Create (all options) | `backlog task create "Feature" -d "Description" -a @sara -s "To Do" -l auth --priority high --ac "Must work" --notes "Initial setup done" --dep task-1 --ref src/api.ts --doc docs/spec.md -p 14` |
| Create with JSON output | `backlog task create "Feature" --json` |
| List tasks  | `backlog task list [-s <status>] [-a <assignee>] [-p <parent>]` |
| List with JSON | `backlog task list --json` |
| List with sort | `backlog task list --sort priority` (priority, id, ordinal, created, due) |
| List overdue | `backlog task list --overdue` |
| List due soon | `backlog task list --due-soon 7` (due within 7 days) |
| List deferred | `backlog task list --deferred` (future defer dates) |
| List by milestone | `backlog task list --milestone "v2.0"` |
| List by priority | `backlog task list --priority high` |
| List by parent | `backlog task list --parent 42` or `backlog task list -p task-42` |
| View detail | `backlog task 7` (interactive UI, press 'E' to edit in editor) |
| View (JSON) | `backlog task 7 --json` |
| View specific section | `backlog task view 7 --json` (full task; or add section: `backlog task view 7 ac`, `backlog task view 7 plan`) |
| View labels | `backlog task labels 7 --json` |
| Edit        | `backlog task edit 7 -a @sara -l auth,backend`       |
| Add plan    | `backlog task edit 7 --plan "Implementation approach"`    |
| Add AC      | `backlog task edit 7 --ac "New criterion" --ac "Another one"` |
| Add DoD     | `backlog task edit 7 --dod "Ship notes"` |
| Remove AC   | `backlog task edit 7 --remove-ac 2` (removes AC #2)      |
| Remove multiple ACs | `backlog task edit 7 --remove-ac 2 --remove-ac 4` (removes AC #2 and #4) |
| Check AC    | `backlog task edit 7 --check-ac 1` (marks AC #1 as done) |
| Check DoD   | `backlog task edit 7 --check-dod 1` (marks DoD #1 as done) |
| Check multiple ACs | `backlog task edit 7 --check-ac 1 --check-ac 3` (marks AC #1 and #3 as done) |
| Uncheck AC  | `backlog task edit 7 --uncheck-ac 3` (marks AC #3 as not done) |
| Uncheck DoD | `backlog task edit 7 --uncheck-dod 3` (marks DoD #3 as not done) |
| Mixed AC operations | `backlog task edit 7 --check-ac 1 --uncheck-ac 2 --remove-ac 4` |
| Mixed DoD operations | `backlog task edit 7 --check-dod 1 --uncheck-dod 2 --remove-dod 4` |
| Add notes   | `backlog task edit 7 --notes "Completed X, working on Y"` (replaces existing) |
| Append notes | `backlog task edit 7 --append-notes "New findings"` |
| Add final summary | `backlog task edit 7 --final-summary "PR-style summary"` |
| Append final summary | `backlog task edit 7 --append-final-summary "More details"` |
| Clear final summary | `backlog task edit 7 --clear-final-summary` |
| Add deps    | `backlog task edit 7 --dep task-1 --dep task-2`     |
| Set due date | `backlog task edit 7 --due-date "2026-07-15"` |
| Clear due date | `backlog task edit 7 --clear-due-date` |
| Set defer date | `backlog task edit 7 --defer-date "2026-07-01"` |
| Clear defer date | `backlog task edit 7 --clear-defer-date` |
| Set milestone | `backlog task edit 7 --milestone "v2.0"` |
| Clear milestone | `backlog task edit 7 --clear-milestone` |
| Set ordinal | `backlog task edit 7 --ordinal 1500` |
| Add label | `backlog task edit 7 --add-label frontend` |
| Remove label | `backlog task edit 7 --remove-label frontend` |
| Clear labels | `backlog task edit 7 --clear-labels` |
| Add modified files | `backlog task edit 7 --modified-file src/api.ts --modified-file src/ui.ts` |
| JSON output on edit | `backlog task edit 7 --json` |
| Archive     | `backlog task archive 7`                             |

### Multi-line input (description/plan/notes/final summary)

The CLI preserves input literally — `\n` sequences are not auto-converted. Use one of the following forms (recommended order for AI agents):

**1. Repeat `--append-*` for each line (works in every shell, including Claude Code / Codex / agent sandboxes):**

```bash
backlog task edit 7 --notes "First line"
backlog task edit 7 --append-notes "Second line"
backlog task edit 7 --append-notes "Third line"
```

**2. Real newlines inside double quotes (single command):**

```bash
backlog task create "Feature" --desc "Line1
Line2

Final paragraph"
```

The same shape works for `--plan`, `--notes`, `--final-summary`, and the `--append-*` variants.

**3. Shell-specific shorthand (interactive shells only — rejected by tree-sitter-based agent sandboxes, see [#595](https://github.com/MrLesk/Backlog.md/issues/595)):**

- **Bash/Zsh (ANSI-C quoting)**

  ```bash
  backlog task edit 7 --notes $'Line1\nLine2'
  ```

- **POSIX sh (printf substitution)**

  ```bash
  backlog task create "Feature" --desc "$(printf 'Line1\nLine2\n\nFinal paragraph')"
  ```

- **PowerShell (backtick-n)**

  ```powershell
  backlog task create "Feature" --desc "Line1`nLine2`n`nFinal paragraph"
  ```

## Search

Find tasks, documents, and decisions across your entire backlog with fuzzy search:

| Action             | Example                                              |
|--------------------|------------------------------------------------------|
| Search tasks       | `backlog search "auth"`                        |
| Filter by status   | `backlog search "api" --status "In Progress"`   |
| Filter by priority | `backlog search "bug" --priority high`        |
| Combine filters    | `backlog search "web" --status "To Do" --priority medium` |
| JSON output  | `backlog search "feature" --json` (for scripts/AI) |
| Limit results | `backlog search "auth" --limit 10` |
| Filter by modified file | `backlog search --modified-file src/api.ts` |
| Filter by type (task/doc/decision) | `backlog search "api" --type task --type doc` (repeatable) |

**Search features:**
- **Fuzzy matching** -- finds "authentication" when searching for "auth"
- **Interactive filters** -- refine your search in real-time with the TUI
- **Live filtering** -- see results update as you type (no Enter needed)

## Draft Workflow

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Create draft | `backlog task create "Feature" --draft`             |
| Draft flow  | `backlog draft create "Spike GraphQL"` → `backlog draft promote 3.1` |
| Demote to draft| `backlog task demote <id>` |

## Dependency Management

Manage task dependencies to create execution sequences and prevent circular relationships:

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Add dependencies | `backlog task edit 7 --dep task-1 --dep task-2`     |
| Add multiple deps | `backlog task edit 7 --dep task-1,task-5,task-9`    |
| Create with deps | `backlog task create "Feature" --dep task-1,task-2` |
| View dependencies | `backlog task 7` (shows dependencies in task view)  |
| Validate dependencies | Use task commands to automatically validate dependencies |

**Dependency Features:**
- **Automatic validation**: Prevents circular dependencies and validates task existence
- **Flexible formats**: Use `task-1`, `1`, or comma-separated lists like `1,2,3`
- **Visual sequences**: Dependencies create visual execution sequences in board view
- **Completion tracking**: See which dependencies are blocking task progress

## Board Operations

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Kanban board      | `backlog board` (interactive UI, press 'E' to edit in editor) |
| Board with layout | `backlog board --layout vertical` (horizontal, vertical) |
| Board by milestones | `backlog board --milestones` |
| Export board | `backlog board export [file]` (exports Kanban board to markdown) |
| Export with version | `backlog board export --export-version "v1.0.0"` (includes version in export) |

## Statistics & Overview

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Project overview | `backlog overview` (interactive TUI showing project statistics) |
| Stats (JSON) | `backlog stats --json` (project statistics as JSON) |
| Stats by milestone | `backlog stats --milestone "v2.0"` |

## Web Interface

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Web interface | `backlog browser` (launches web UI on port 6420) |
| Web custom port | `backlog browser --port 8080 --no-open` |
| Non-interactive | `backlog browser --non-interactive` (auto-selects next free port) |
| Open task in browser | `backlog open task-123` or `backlog open 123` |
| Open with custom port | `backlog open task-123 --port 8080` |

To keep the Web UI running in the background with auto-start on boot, see [Running Backlog.md as a Service](backlog/docs/doc-003%20-%20Running-Backlog-Browser-as-a-Service.md).

## Documentation

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Create doc | `backlog doc create "API Guidelines"` |
| Create with path | `backlog doc create "Setup Guide" -p guides/setup` |
| Create with type | `backlog doc create "Architecture" -t guide` |
| Update content | `backlog doc update doc-1 --content "Updated markdown"` |
| Update metadata/path | `backlog doc update doc-1 --title "Setup Handbook" -t guide --tags setup,runbook -p guides` |
| List docs | `backlog doc list` |
| View doc | `backlog doc view doc-1` |
| List docs (JSON) | `backlog doc list --json` |
| View doc (JSON) | `backlog doc view doc-1 --json` |
| Archive doc | `backlog doc archive doc-1` |
| Delete doc | `backlog doc delete doc-1` |
| Filter by label | `backlog doc list --label guide --label setup` (repeatable) |

## Decisions

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Create decision | `backlog decision create "Use PostgreSQL for primary database"` |
| Create with status | `backlog decision create "Migrate to TypeScript" -s proposed` |
| List decisions (JSON) | `backlog decision list --json` |
| View decision (JSON) | `backlog decision view doc-1 --json` |
| Resolve decision | `backlog decision resolve doc-1` (mark superseded without replacement) |
| Supersede decision | `backlog decision supersede doc-1 --title "New decision title"` |
| Filter by supersedes | `backlog decision list --supersedes doc-1` |
| Filter by superseded-by | `backlog decision list --superseded-by doc-1` |
| Filter decisions by label | `backlog decision list --label deprecated` |

## Config Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List config       | `backlog config list` |
| List config (JSON) | `backlog config list --json` |
| Get config key    | `backlog config get project_name` |
| Get config key (JSON) | `backlog config get definition_of_done --json` |
| Set config key    | `backlog config set definition_of_done '["Tests pass","Docs updated"]'` |

## Milestone Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List milestones | `backlog milestone list` |
| List milestones (JSON) | `backlog milestone list --json` |
| Create milestone | `backlog milestone create "v2.0" -d "Spring 2026 release"` |
| Rename milestone | `backlog milestone rename "v2.0" "v2.1"` |
| Remove milestone | `backlog milestone remove "v2.0"` (clears from tasks) |
| Archive milestone | `backlog milestone archive "v2.0"` |

## Label Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List labels | `backlog label list` |
| List labels (JSON) | `backlog label list --json` |
| Add label | `backlog label add frontend --color "#00ff00"` |
| Rename label | `backlog label rename frontend ui` |
| Remove label | `backlog label remove frontend` |
| Set label color | `backlog label set-color frontend "#ff0000"` |
| Remove label color | `backlog label remove-color frontend` |

## Author Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List authors | `backlog author list` |
| List authors (JSON) | `backlog author list --json` |
| Add author | `backlog author add @sara --color "#ff0000"` |
| Rename author | `backlog author rename @sara @sarah` |
| Remove author | `backlog author remove @sarah` |
| Set author color | `backlog author set-color @sara "#00ff00"` |
| Remove author color | `backlog author remove-color @sara` |

## Sequence Management

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List sequences | `backlog sequence list` (interactive by default) |
| List sequences (plain) | `backlog sequence list --plain` |

## Migration

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| Migrate archive structure | `backlog migrate archive-structure` |
| Force migration | `backlog migrate archive-structure --force` |
| Migrate without git | `backlog migrate archive-structure --no-git` |

## Agent Instructions

| Action                                          | Example                                              |
|-------------------------------------------------|------------------------------------------------------|
| Update agent legacy CLI agent instruction files | `backlog agents --update-instructions` (updates CLAUDE.md, AGENTS.md, GEMINI.md, .github/copilot-instructions.md) |

## Maintenance

| Action      | Example                                                                                      |
|-------------|----------------------------------------------------------------------------------------------|
| Cleanup done tasks | `backlog cleanup` (move old completed tasks to completed folder to cleanup the kanban board) |

## Workflow Guidance

| Action      | Example                                              |
|-------------|------------------------------------------------------|
| List available guides | `backlog instructions` |
| Read overview | `backlog instructions overview` |
| Read task creation guide | `backlog instructions task-creation` |
| Read task execution guide | `backlog instructions task-execution` |
| Read task finalization guide | `backlog instructions task-finalization` |

Full help: `backlog --help`

---

## Sharing & Export

### Board Export

Export your Kanban board to a clean, shareable markdown file:

```bash
# Export to default Backlog.md file
backlog board export

# Export to custom file
backlog board export project-status.md

# Force overwrite existing file
backlog board export --force

# Export to README.md with board markers
backlog board export --readme

# Include a custom version string in the export
backlog board export --export-version "v1.2.3"
backlog board export --readme --export-version "Release 2024.12.1-beta"
```

Perfect for sharing project status, creating reports, or storing snapshots in version control.

---

## Shell Tab Completion

Backlog.md includes built-in intelligent tab completion for bash, zsh, fish, and PowerShell shells. Completion scripts are embedded in the binary — no external files needed.

**Quick Installation:**
```bash
# Auto-detect and install for your current shell
backlog completion install

# Or specify shell explicitly
backlog completion install --shell bash
backlog completion install --shell zsh
backlog completion install --shell fish
backlog completion install --shell pwsh
```

**What you get:**
- Command completion: `backlog <TAB>` → shows all commands
- Dynamic task IDs: `backlog task edit <TAB>` → shows actual task IDs from your backlog
- Smart flags: `--status <TAB>` → shows configured status values
- Context-aware suggestions for priorities, labels, and assignees

Full documentation: See [completions/README.md](completions/README.md) for detailed installation instructions, troubleshooting, and examples.
