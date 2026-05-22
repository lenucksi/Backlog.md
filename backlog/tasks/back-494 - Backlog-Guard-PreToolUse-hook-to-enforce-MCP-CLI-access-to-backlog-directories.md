---
id: BACK-494
title: >-
  Backlog-Guard: PreToolUse hook to enforce MCP/CLI access to backlog
  directories
status: Done
assignee:
  - '@lenucksi'
created_date: '2026-05-13 11:12'
updated_date: '2026-05-22 15:39'
labels:
  - tooling
  - hooks
  - dx
  - agent
milestone: m-13
dependencies: []
priority: medium
ordinal: 186000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Agents routinely attempt direct Read/Write/Edit/Bash operations on markdown files inside the `backlog/` directory tree. This bypasses Backlog.md's data model (status transitions, ID allocation, lock files, git integration) and is explicitly forbidden.

Implement a Claude Code PreToolUse hook — modelled after serena-guard — that hard-blocks any tool call targeting configured protected directories and redirects the agent to the correct MCP tool or CLI command with pre-filled parameters.

Configuration is file-based: a `.backlog-guard` YAML file in the project root lists the protected directories. The hook discovers this file by walking up from CWD to the git root, with a fallback auto-detect via `backlog/config.yml`.

A `.codex/skills/backlog-guard-setup/SKILL.md` skill enables one-command setup that:
- Auto-detects the backlog directory
- Creates the `.backlog-guard` config file
- Writes the hook entry into the appropriate settings file
- Optionally adds `mcp__backlog__*` tool permissions to the settings allowlist

The hook ships inside the Backlog.md repo under `hooks/backlog-guard/` so it is co-located and discoverable without a separate repository.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 hooks/backlog-guard/guard.sh exists, is executable, reads stdin JSON, exports env vars, calls check.py
- [x] #2 hooks/backlog-guard/check.py blocks Read/Write/Edit when file_path is under any protected dir
- [x] #3 hooks/backlog-guard/check.py blocks Bash commands (cat/head/tail/grep non-pipeline/find) targeting protected dirs
- [x] #4 Protected dirs read from .backlog-guard config file (YAML, dirs: key) discovered by walking up to git root
- [x] #5 Fallback auto-detection when no config file: scan CWD and up to 3 parents for backlog/config.yml
- [x] #6 Task ID extracted from filename (back-NNN-...) appears in block message for task files
- [x] #7 Block message includes both MCP tool call AND equivalent CLI command for every operation type
- [x] #8 hooks/backlog-guard/README.md documents installation, config file format, and what is blocked/allowed
- [x] #9 .codex/skills/backlog-guard-setup/SKILL.md creates .backlog-guard file and writes hook into settings
- [x] #10 Setup skill offers to add mcp__backlog__* tool permissions to the settings allowlist
- [x] #11 At least 6 Python tests covering: block task/doc, allow non-backlog, bash cat block, auto-detect, no-config clean exit
- [x] #12 All changes on feature branch rebased on upstream-master, clean PR
- [x] #13 #13 Ported from Python/legacy JS to shared TypeScript: guard-core.ts replaces check.py + opencode-plugin.js
- [x] #14 #14 26 bun tests pass (was 12 pytest tests); Biome check clean; tsc --noEmit clean
- [x] #15 #15 guard.sh supports bun -> npx tsx -> node fallback runtime
- [x] #16 #16 MCP tool names shown in dual format: mcp__backlog__* (Claude Code) and backlog_* (OpenCode)
- [x] #17 #17 .claude-plugin/plugin.json + hooks/hooks.json for Claude Code plugin marketplace install
- [x] #18 #18 skills/use-backlog-mcp and skills/create-backlog-task shipped with plugin
- [x] #19 #19 opencode-plugin.ts uses new export const format with @opencode-ai/plugin conventions
- [x] #20 #20 interactive install.sh script creates .backlog-guard, registers hooks, sets up OpenCode
- [x] #21 #21 dev.sh pipeline: biome check -> ts check -> tests -> build -> copy to package directory
- [x] #22 #22 npm package @lenucksi/backlog-guard created at packages/backlog-guard/ for GitHub Packages
- [x] #23 #23 GitHub Actions publish workflow (.github/workflows/publish-backlog-guard.yml)
- [x] #24 #24 .claude-plugin/marketplace.json for one-liner install via /plugin marketplace add .
- [x] #25 #25 Worktree branch rebased on main, ready for upstream PR
- [x] #26 #26 Blocked milestone Read/Write/Edit suggests milestone_list / milestone_add / milestone_rename instead of generic search
- [x] #27 #27 Blocked decision Read suggests backlog search --type decision (no dedicated view tool exists)
- [x] #28 #28 Blocked decision Write suggests backlog decision create --status proposed (no MCP tool)
- [x] #29 #29 Blocked config Write suggests backlog config set (generic CLI only)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Architecture

- `hooks/backlog-guard/guard.sh` — bash wrapper (identical pattern to serena-guard): reads stdin JSON, exports env vars (HOOK_TOOL, HOOK_FP, HOOK_CMD, HOOK_INPUT), calls check.py
- `hooks/backlog-guard/check.py` — path-prefix blocking logic (not extension-based). Discovers `.backlog-guard` YAML config by walking up to git root; fallback auto-detects `backlog/config.yml`. Generates targeted MCP+CLI suggestions from the blocked path.
- `hooks/backlog-guard/test_check.py` — 8 pytest tests covering all block/allow/edge cases
- `hooks/backlog-guard/README.md` — installation and configuration docs
- `.codex/skills/backlog-guard-setup/SKILL.md` — Claude Code setup skill

### Config File Format (`.backlog-guard` at git root)

```yaml
# Directories agents must not access directly. Paths relative to this file.
dirs:
  - backlog/
```

Discovery order in check.py:
1. `git rev-parse --show-toplevel` → look for `.backlog-guard` there
2. Walk CWD up to 4 levels looking for `.backlog-guard`
3. Fallback: walk CWD looking for `backlog/config.yml` (auto-detect)
4. If nothing found: `sys.exit(0)` — clean exit, no false positives

### Blocking Logic

- **Read/Write/Edit**: block if `file_path` resolves under any protected dir
- **Bash**: parse first pipeline segment only; block if `cat/head/tail/less/more/bat` args, `grep`/`egrep`/`fgrep` file args (not pattern position), or `find` root arg resolves under protected dir
- **Block message**: extract task ID from filename (`back-NNN-title.md` → `BACK-NNN`), classify path (task/doc/decision/milestone/config), produce exact MCP call + CLI command

### Setup Skill Workflow

1. Detect `backlog/config.yml` (walk up from CWD)
2. Locate `guard.sh` (source tree → global npm install → ask user)
3. Create `.backlog-guard` YAML in git root
4. Ask: project-local (`.claude/settings.local.json`) or user-global (`~/.claude/settings.json`)?
5. Write hook entry (matcher: `Read|Edit|Write|Bash`, command: abs path to guard.sh)
6. Offer to add full `mcp__backlog__*` allowlist to `permissions.allow`
7. Report and remind user to reload Claude Code

### Branch / PR Strategy

- Worktree at `./worktrees/backlog-guard` from `origin/main`
- Branch: `feature/back-494-backlog-guard-hook`
- PR title: `BACK-494 - Backlog-Guard: PreToolUse hook to enforce MCP/CLI access to backlog directories`
- No existing source files modified — all changes are additive

### serena-guard Reference

Both serena-guard versions (standalone + non-standalone) use identical hard-blocking (`permissionDecision: "deny"`). backlog-guard follows the same pattern. The only difference: path-prefix detection instead of file-extension detection.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All 5 files created via Serena (serena-guard blocked direct Write on .sh/.py):
- hooks/backlog-guard/guard.sh (executable, bash wrapper)
- hooks/backlog-guard/check.py (path-prefix blocking, YAML config discovery, MCP+CLI suggestions)
- hooks/backlog-guard/test_check.py (8 pytest tests, all passing in 1.65s)
- hooks/backlog-guard/README.md (installation, config format, block/allow table, serena-guard comparison)
- .codex/skills/backlog-guard-setup/SKILL.md (setup skill with 7-step workflow)
- .gitignore: added __pycache__/ and *.pyc

Branch: feature/back-494-backlog-guard-hook
Commit: 59308c6
PR: https://github.com/MrLesk/Backlog.md/pull/649

=== TypeScript Refactor (2026-05-20) ===

Ported from Python check.py + legacy JS to unified TypeScript guard-core.ts shared by Claude Code + OpenCode. Uses yaml@2 + shell-quote (zero deps).

26 bun tests replace 12 pytest tests. guard.sh uses bun -> npx tsx -> node fallback.

Dual MCP naming: mcp__backlog__* (Claude Code) + backlog_* (OpenCode).

Claude Code plugin: .claude-plugin/ + hooks/hooks.json + marketplace.json for one-liner install.

Shipped skills: use-backlog-mcp, create-backlog-task.

npm package @lenucksi/backlog-guard for GitHub Packages.

GitHub Actions publish workflow (.github/workflows/publish-backlog-guard.yml).

Deleted old files: check.py, opencode-plugin.js (old format), test_check.py.

3 commits on feature/back-494-backlog-guard-hook, rebased on main.

=== Improved Per-Type Suggestions (2026-05-20) ===

Added milestoneSuggestions(): Read→milestone_list, Write→milestone_add, Edit→milestone_rename/remove/archive

Added decisionSuggestions(): Read→backlog search --type decision (no view MCP), Write→backlog decision create (no MCP), Edit→note that no edit tool exists

Added configSuggestions(): get/list/set via CLI only

buildErrorMessage routes by kind: task→taskSuggestions, doc→docSuggestions, milestone→milestoneSuggestions, decision→decisionSuggestions, config→configSuggestions, other→genericSuggestions fallback

grepSuggestions: doc+decision both route to document_search (decisions share search index with docs)

33 tests pass (+7 new: milestone read/write/edit, decision write, config read/write, grep decisions)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented backlog-guard: a Claude Code PreToolUse hook that hard-blocks direct Read/Edit/Write/Bash access to configured backlog directories and redirects agents to the correct MCP tool or CLI command.

Files delivered (all additive, no existing source modified):
- hooks/backlog-guard/guard.sh — bash wrapper, identical pattern to serena-guard
- hooks/backlog-guard/check.py — path-prefix detection, YAML config discovery (git root walk-up + auto-detect fallback), targeted MCP+CLI suggestions with task ID extracted from filename
- hooks/backlog-guard/test_check.py — 8 pytest tests, all passing (1.65s)
- hooks/backlog-guard/README.md — installation, config format, block/allow table, serena-guard comparison
- .codex/skills/backlog-guard-setup/SKILL.md — 7-step setup skill: auto-detects backlog dir, creates .backlog-guard, writes hook entry, optionally adds mcp__backlog__* allowlist

Notable: serena-guard blocked direct Write on .py/.sh files during implementation — correctly redirected to mcp__plugin_serena_serena__create_text_file.

Commit: 59308c6
PR: https://github.com/MrLesk/Backlog.md/pull/649

TypeScript Refactor (2026-05-20): Replaced Python check.py + legacy JS opencode-plugin.js with unified TypeScript guard-core.ts. Shared core for Claude Code + OpenCode. Uses yaml@2 + shell-quote (zero deps). 26 bun tests. Dual MCP naming. Claude Code plugin structure with marketplace. Backlog skills included. npm package @lenucksi/backlog-guard for GitHub Packages with Actions publish workflow. Interactive install.sh + dev.sh pipeline. 3 commits on feature/back-494-backlog-guard-hook, rebased on main.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
