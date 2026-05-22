---
id: BACK-527.3
title: 'Phase 3: Commands Coverage ≥70% via termless/vterm.js'
status: Done
assignee: []
created_date: '2026-05-22 13:28'
updated_date: '2026-05-22 15:00'
labels:
  - testing
  - coverage
  - phase-3
  - commands
  - termless
dependencies: []
parent_task_id: BACK-527
priority: high
ordinal: 237000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coverage für 3 große Command-Dateien auf ≥70% bringen. Nutzt termless + vterm.js Backend für CLI-Spawn + Output-Assertions.

## Methodik

Verwende `term()` aus `src/test/termless-helper.ts` für CLI-Tests:

```typescript
import { term } from "../test/termless-helper.ts";
import { join } from "node:path";

const t = term(120, 40);
const cliPath = join(process.cwd(), "src", "cli.ts");
await t.spawn(["bun", cliPath, "task", "list", "--plain"], { cwd: testDir });
await t.waitFor("task-1", 10000);
expect(t.screen).toContainText("task-1");
await t.close();
```

Für Subcommand-Testing: `task create --plain`, `task list --plain`, `config get --plain`, `init --plain`.

## Files

1. **src/commands/task.ts** (1028 lines) — Task CRUD + alle Subcommands
   - Teste: create (flags: title, description, status, priority, labels, assignee), list, edit, complete, search, view
   - Nutze `--plain` Flag für text-basierten Output
   
2. **src/commands/init.ts** (971 lines) — Projekt-Initialisierung
   - Teste: init mit/ohne Namen, autoCommit, init in bestehendem git repo, --backlog-dir

3. **src/commands/config.ts** (416 lines) — Config get/set/list
   - Teste: config get, set, list, ungültige Keys

## Termless Infrastruktur

- **Backend**: vterm.js (via src/test/vterm-backend.ts) — 100% terminfo.dev Coverage
- **Helper**: src/test/termless-helper.ts — Convenience Wrapper
- **Matchers**: `expect.extend(termlessMatchers)` via `@termless/core` — bun:test kompatibel
- **Cell-Level**: `expect(t.cell(0,0).bold).toBe(true)`
- **Text**: `expect(t.screen).toContainText("output")`

## Referenzen
- doc-7: Terminal Test Strategie (Bun PTY vs termless)
- doc-8: Termless Analysis Report (Packaging Bug, vterm.js Adapter, DA1/DA2 Fix)
- src/test/termless-helper.ts: Convenience Wrapper
- src/test/vterm-backend.ts: TerminalBackend Adapter
- src/test/tui-termless-core.test.ts: Beispiel-Tests
- src/test/tui-interactive-editor-handoff.test.ts: PTY-Interaktion
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
