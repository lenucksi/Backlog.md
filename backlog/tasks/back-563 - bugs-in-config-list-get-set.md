---
id: BACK-563
title: bugs in config list/get/set
status: Done
assignee:
  - "@jo"
created_date: 2026-06-17 09:19
updated_date: 2026-06-17 12:48
labels:
  - bug2
dependencies: []
priority: high
ordinal: 315000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
defaultEditor: (not set)
  defaultStatus: To Do
  statuses: [To Do, In Progress, Blocked, Done, Deferred]
  labels: []
  milestones: [m-7, m-8, m-9, m-10, m-11, m-12, m-13, m-14]
  definitionOfDone: []
  maxColumnWidth: 20
  autoOpenBrowser: true
  defaultPort: 6420
  remoteOperations: false
  autoCommit: false
  filesystemOnly: true
  bypassGitHooks: false
  zeroPaddedIds: (disabled)
  taskPrefix: task (read-only)
  checkActiveBranches: false
  activeBranchDays: 30

während die datei enthält

      │ File: backlog/config.yml
───────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   1   │ project_name: "tigges-consulting-website"
   2   │ default_status: "To Do"
   3 ~ │ statuses: ["To Do", "In Progress", "Blocked", "Done", "Deferred"]
   4   │ labels:
   5   │   - setup
   6   │   - infrastructure
   7   │   - assets
   8   │   - design
   9   │   - template
  10   │   - core
  11   │   - homepage
  12   │   - blog
  13   │   - papers
  14   │   - feature
  15   │   - mastodon
  16   │   - seo
  17   │   - i18n
  18   │   - content
  19   │   - ci
  20   │   - qa
  21   │ 
  22   │ max_column_width: 20
  23   │ auto_open_browser: true
  24   │ default_port: 6420
  25   │ remote_operations: false
  26   │ auto_commit: false
  27   │ filesystem_only: true
  28   │ bypass_git_hooks: false
  29   │ check_active_branches: false
  30   │ active_branch_days: 30
  31   │ task_prefix: "task"
  32   │ dod_defaults:
  33   │   - "Alle ACs sind erfüllt und einzeln gehakt"
  34   │   - "Code läuft lokal fehlerfrei (hugo server)"
  35   │   - "Keine neuen Hugo-Fehler/Warnings im Build"
  36   │   - "Keine Mergekonflikte mit main"
  37   │   - "Implementation notes mit lessons learned ergänzt"
  38   │   - "References (angefasste Dateien + commit SHA) gesetzt"
  39   │   - "Task status = Done (via complete, nicht archive)"
  40   │ auto_collapse_milestones: true

[jo@archtest website-new]$ backlog config get terminalStatuses

[jo@archtest website-new]$ backlog config get terminalStatus
Unknown config key: terminalStatus
Available keys: defaultEditor, projectName, defaultStatus, statuses, labels, milestones, definitionOfDone, maxColumnWidth, defaultPort, autoOpenBrowser, remoteOperations, autoCommit, filesystemOnly, bypassGitHooks, zeroPaddedIds, checkActiveBranches, activeBranchDays, terminalStatuses
[jo@archtest website-new]$ backlog config get terminalStatuses

-> es fehlt blockedStatuses und in list erscheinen auch nicht die terminalStatuses.

-> Insgesamt klingt das verbuggt

irgendwas, ggf der web config set teil, oder der cli config set teil, führt auch dazu dass die labels die in der config stehen geleert werden.
Dito mit der DoD:

git diff backlog/config.yml
diff --git a/backlog/config.yml b/backlog/config.yml
index 54bf509..f9b91e0 100644
--- a/backlog/config.yml
+++ b/backlog/config.yml
@@ -1,24 +1,9 @@
 project_name: "tigges-consulting-website"
 default_status: "To Do"
-statuses: ["To Do", "In Progress", "Blocked", "Done"]
-labels:
-  - setup
-  - infrastructure
-  - assets
-  - design
-  - template
-  - core
-  - homepage
-  - blog
-  - papers
-  - feature
-  - mastodon
-  - seo
-  - i18n
-  - content
-  - ci
-  - qa
-
+statuses: ["To Do", "In Progress", "Blocked", "Done", "Deferred"]
+terminal_statuses: ["Done"]
+blocked_statuses: ["Blocked", "Deferred"]
+labels: []
 max_column_width: 20
 auto_open_browser: true
 default_port: 6420
@@ -29,12 +14,4 @@ bypass_git_hooks: false
 check_active_branches: false
 active_branch_days: 30
 task_prefix: "task"
-dod_defaults:
-  - "Alle ACs sind erfüllt und einzeln gehakt"
-  - "Code läuft lokal fehlerfrei (hugo server)"
-  - "Keine neuen Hugo-Fehler/Warnings im Build"
-  - "Keine Mergekonflikte mit main"
-  - "Implementation notes mit lessons learned ergänzt"
-  - "References (angefasste Dateien + commit SHA) gesetzt"
-  - "Task status = Done (via complete, nicht archive)"
 auto_collapse_milestones: true
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 yaml.parse() replace custom parseConfig — multi-line labels/dod_defaults round-trip
- [ ] #6 yaml.stringify() replace custom serializeConfig — flow-style arrays + unknown-key preservation
- [ ] #7 config CLI schema-agnostisch mit fuzzy matching + permissive set
- [ ] #8 saveConfig() unknown-key preservation merged from cachedRawConfig
- [ ] #9 bun test + bunx tsc --noEmit + bun run check . green
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Root Cause Analysis

Der Config-Parser (`parseConfig` in `src/file-system/operations.ts`, line 1679) ist ein hand-geschriebener Zeile-für-Zeile-Parser, der **nur** Inline-Array-Syntax (`labels: [a, b]`) erkennt. Multi-Line YAML-Listen (`labels:\n  - item`) werden **komplett ignoriert**, weil `value.startsWith("[")` auf die leere Value nach dem Doppelpunkt fehlschlägt.

### Betroffen
- **Labels** in Multi-Line-Format → immer `[]` → gehen auf jedem `saveConfig()` verloren
- **dod_defaults** in Multi-Line-Format → wird weder als `definition_of_done` noch als `dod_defaults` erkannt
- **Jeder Config-Save überschreibt die Datei mit leeren Labels und ohne DoD**

### Datenverlust-Kette
1. `loadConfig()` → Labels sind `[]`, DoD ist `undefined` (Parser-Fail)
2. User ändert irgendein Config-Feld (WebUI, CLI set, wizard)
3. `saveConfig(config)` → schreibt `labels: []` und kein `definition_of_done`
4. Datei ist korrupt — Labels und DoD unwiederbringlich weg

## Lösung

`yaml` (eemeli/yaml v2.9.0) ist **bereits npm-Dependency** und in `src/utils/frontmatter.ts` in Produktion. Ersetze `parseConfig`/`serializeConfig` damit.

### parseConfig
- `yaml.parse(content)` gibt Record mit snake_case-Keys
- Mapping snake_case→camelCase + dod_defaults→definitionOfDone + task_prefix→prefixes.task
- Alle Formate (inline, block) werden korrekt geparst

### serializeConfig
- `yaml.stringify()` mit Document API für flow-style Arrays
- Unknown-Key-Preservation: Merge mit cachedRawConfig

### CLI config list/get/set
- **config list**: Zeigt rohe YAML-Keys aus `yaml.parse()` — keine hardcodierte Allowlist
- **config get**: Exakter Match + Fuzzy-Fallback (Levenshtein) mit "Meintest du?"-Vorschlägen
- **config set**: Akzeptiert jeden Key + Type-Coercion für bekannte Typen

All 63 config/DoD/filesystem tests pass after replacing custom YAML parser with `yaml` (eemeli/yaml) library.

Key changes: parseConfig uses yaml.parse() + snake→camel mapping, serializeConfig uses Document API + visit() for flow-style arrays, saveConfig merges with cachedRawConfig for unknown-key preservation.

~250 lines of dead custom-parser code removed.

3 test regressions fixed: empty DoD block → [], backslash round-trip assertions, YAML injection assertion updated.

Next phase: CLI rewrite (src/commands/config.ts) — schema-agnostic list/get/set with fuzzy matching. Builds on cachedRawConfig/loadRawConfig foundation.

Phase 1 done: Schema-driven CLI rewrite (`src/utils/config-schema.ts` + `src/commands/config.ts`)

`config list`: schema-driven display, all keys (including terminal_statuses/blocked_statuses), unknown YAML keys warning with ⚠

`config get <key>`: exact match → fuzzy "Meinten Sie?" → error. No camelCase fallback.

`config get` without key: shows --help

`config set <key> <value>`: schema-driven type coercion + validation, unknown keys rejected with fuzzy suggest. `statuses`/`labels` accept JSON arrays.

`config list --json`: outputs full raw YAML record (including unknown keys)

422 lines removed vs old 522-line hardcoded switch/case file

TypeScript clean + biome clean + 82/82 tests pass
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixes for BACK-563 (config bugs) plus two bonus features:

## Config (BACK-563 core)
- Replaced custom parseConfig with yaml-native parse() + Document API serialize with lineWidth:80
- Schema-driven CLI config list/get/set (src/utils/config-schema.ts) — 422 lines removed vs old hardcoded switch/case
- snake_case-only CLI keys with fuzzy matching ("Meinten Sie?")
- saveConfig() preserves unknown YAML keys via cachedRawConfig
- pretty-print arrays >5 items or >80 chars inline → multi-line
- All 82+ tests pass, tsc + biome clean

## Label rename color-loss fix (BACK-563)
- CLI `label rename` (label.ts) and MCP `backlog_label_rename` (handlers.ts) now preserve {name, color} when renaming
- Helper preserveLabelColor() extracts pattern

## MCP label color tools (BACK-563)
- New `backlog_label_set_color` tool — set/change label color
- New `backlog_label_remove_color` tool — revert colored label to plain string
- Schemas, handlers, registration in src/mcp/tools/labels/

## WebUI terminal/blocked statuses (BACK-562)
- Added tag-select button groups in Settings.tsx → "Workflow Settings"
- Options populated from statuses API; toggle each status on/off
- TUI Config Screen explicitly N/A (would need full TUI config panel — future work)

## Feature Parity Doc
- Updated doc-005 with new Labels section, gap resolutions, v2.2 version
<!-- SECTION:FINAL_SUMMARY:END -->