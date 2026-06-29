## Backlog.md Overview (CLI)

You are using Backlog.md via the CLI. Use the following commands to retrieve guidance and manage tasks.

### When to Use Backlog

**Create a task if the work requires planning or decision-making.** Ask yourself: "Do I need to think about HOW to do this?"

- **YES** → Search for existing task first, create if needed
- **NO** → Just do it (the change is trivial/mechanical)

**Examples of work that needs tasks:**
- "Fix the authentication bug" → need to investigate, understand root cause, choose fix
- "Add error handling to the API" → need to decide what errors, how to handle them
- "Refactor UserService" → need to plan new structure, migration path

**Examples of work that doesn't need tasks:**
- "Fix typo in README" → obvious mechanical change
- "Update version number to 2.0" → straightforward edit
- "Add missing semicolon" → clear what to do

**Always skip tasks for:** questions, exploratory requests, or knowledge transfer only.

### Getting Instructions

Use this command to retrieve detailed workflow guidance:

- `backlog instructions` — Lists available guides. Add a guide name to read it (e.g., `backlog instructions task-creation`).

Available guides: `overview`, `task-creation`, `task-execution`, `task-finalization`.

### Typical Workflow (CLI)

1. **Search first:** run `backlog search` or `backlog task list --json` with filters to find existing work
2. **If found:** read details via `backlog task view <id> --json`; follow execution/plan guidance from the retrieved instructions
3. **If not found:** run `backlog instructions task-creation`, then create tasks with `backlog task create`
4. **Execute & finalize:** run `backlog instructions task-execution` or `backlog instructions task-finalization` to manage status, plans, notes, and acceptance criteria via `backlog task edit`

### Core Principle

Backlog tracks **commitments** (what will be built). Use your judgment to distinguish between "help me understand X" (no task) vs "add feature Y" (create tasks).

### CLI Commands Quick Reference

- `backlog instructions` — get workflow guidance
- `backlog task list --json`, `backlog search`, `backlog task view <id> --json`, `backlog task create`, `backlog task edit`, `backlog task archive`
- `backlog search --modified-file <path>` for case-insensitive path substring filtering
- `backlog doc list --json`, `backlog doc view <id> --json`, `backlog doc create`, `backlog doc update`, `backlog doc search`
- `backlog doc create` and `backlog doc update` support docs-directory-relative `path` values such as `guides/setup`; absolute paths and `..` traversal are rejected
- `backlog config get definition_of_done --json` — read project-level DoD defaults
- `backlog config set definition_of_done '<json-array>'` — set project-level DoD defaults

**Definition of Done support**
- `backlog config get definition_of_done --json` reads project-level DoD defaults
- `backlog config set definition_of_done '["Item 1", "Item 2"]'` updates them
- `backlog task create --dod "Item" --dod "Item 2"` for task-specific overrides
- `backlog task edit <id> --dod "Item" --check-dod 1` for task-specific updates
- DoD is a completion checklist, not acceptance criteria: keep scope/behavior in acceptance criteria, not DoD fields
- `backlog task view <id> --json` output includes the Definition of Done checklist

**Always use the CLI. Never edit markdown files directly; use the CLI so relationships, metadata, and history stay consistent.**
