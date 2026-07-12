---
id: BACK-0633
title: Integrate structured logging (consola) across all modalities
status: To Do
assignee: []
created_date: 2026-07-12 17:42
labels:
  - infrastructure
  - logging
  - dev-ex
milestone: m-13
dependencies: []
priority: medium
ordinal: 434000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The project currently uses ad-hoc `console.log`/`console.error` for diagnostic logging. Add a structured logging layer based on **consola** that:

1. Supports log levels (debug, info, warn, error, fatal)
2. Routes CLI diagnostics to stderr (not stdout — stdout is for pipeable command output)
3. Works across all 4 modalities: CLI (terminal), TUI (termless), WebUI (browser console), MCP (stderr JSON)
4. Respects `--verbose` / `--json` CLI flags
5. Provides a single `src/utils/logger.ts` factory that auto-detects the runtime

**Research summary** (from dedicated research task):
- consola recommended over pino/tslog/roarr because its reporter pattern maps 1:1 to the modality split
- Effort estimate: 1-2 days for basic integration, additional time for modality-specific reporter tuning
- Architecture: single `createLogger()` factory → reporter swapped per modality at init

**Key rule:** stdout is for CLI command output ONLY. All diagnostic/debug logging goes to stderr (or browser console in WebUI).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 consola dependency added to package.json
- [ ] #2 src/utils/logger.ts exports createLogger() with modality detection
- [ ] #3 CLI mode: all diagnostics go to stderr, respect --verbose/--json flags
- [ ] #4 TUI mode: minimal logging to stderr (avoid escape code corruption)
- [ ] #5 WebUI mode: logs to browser console via consola's browser reporter
- [ ] #6 MCP mode: JSON logging to stderr
- [ ] #7 All existing console.error() calls migrated to logger.error()
- [ ] #8 bun run check:types passes
- [ ] #9 bun test passes
<!-- AC:END -->

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