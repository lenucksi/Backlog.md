---
id: BACK-532
title: backlog open CLI command + MCP tool — entity-aware browser navigation
status: To Do
assignee: []
created_date: '2026-05-22 19:08'
labels:
  - cli
  - mcp
  - webui
milestone: m-13
dependencies: []
references:
  - BACK-257
  - src/commands/browser.ts
  - src/server/index.ts
  - src/web/utils/urlHelpers.ts
  - src/cli.ts
  - src/mcp/server.ts
priority: medium
ordinal: 255000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Users need a quick way to open a task, document, or decision in the browser without navigating manually. The `backlog open <id>` command provides a unified entry point:
- Resolves entity type from the ID prefix (BACK- / doc- / decision-)
- Constructs the correct URL using BACK-257's deep-link format
- Opens the system browser at that URL

## Entity type detection (ID prefix convention)

| ID Pattern | Entity Type | URL Path |
|---|---|---|
| `BACK-531`, `back-531` | Task | `/tasks/531/slug` or `/board/531/slug` |
| `doc-007` | Document | `/documentation/007/slug` |
| `decision-003` | Decision | `/decisions/003/slug` |

The `slug` is generated via `sanitizeUrlTitle(entity.title)` — loaded by looking up the entity.

## URL patterns (from BACK-257)

- Tasks: `http://localhost:<port>/tasks/<stripped-id>/<sanitized-title>`
- Docs: `http://localhost:<port>/documentation/<stripped-id>/<sanitized-title>`
- Decisions: `http://localhost:<port>/decisions/<stripped-id>/<sanitized-title>`

## CLI: `backlog open <id>`

```
backlog open BACK-531
# Opens http://localhost:6420/tasks/531/dependency-write-guard

backlog open doc-007 --port 7654
# Opens http://localhost:7654/documentation/007/...

backlog open unknown-xyz
# Error: No entity found with ID "unknown-xyz"
```

Options:
- `-p, --port <port>` — custom port (default: config.defaultPort ?? 6420)

## MCP: `backlog_open_in_browser`

Tool schema:
```json
{
  "name": "backlog_open_in_browser",
  "description": "Open a backlog task, document, or decision in the browser",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Entity ID (e.g. BACK-531, doc-007, decision-003)" },
      "port": { "type": "number", "description": "Custom port (optional, default from config)" }
    },
    "required": ["id"]
  }
}
```

Response:
```json
{
  "content": [{ "type": "text", "text": "Opened http://localhost:6420/tasks/531/dependency-write-guard" }]
}
```

## Implementation plan

1. Create `src/commands/open.ts`:
   - `registerOpenCommand(program)` — registers `backlog open <id>`
   - Resolves entity type from ID prefix
   - Loads entity to get title, generates slug
   - Constructs URL, opens browser (platform-aware)

2. Create `src/mcp/tools/open/`:
   - `schemas.ts` — `openInBrowserSchema`
   - `handlers.ts` — `OpenHandlers` class with `openInBrowser(args)`
   - `index.ts` — `registerOpenTools(server, config)`

3. Create `src/utils/browser-opener.ts`:
   - Extract platform-aware open logic from `src/server/index.ts` into a shared utility
   - `openUrlInBrowser(url: string): Promise<void>`

4. Extract `sanitizeUrlTitle` / `createUrlPath` to shared utils (currently in `src/web/utils/urlHelpers.ts`):
   - Move to `src/utils/url-helpers.ts` for CLI/MCP access
   - Or re-export from web location

5. Wire up:
   - `src/cli.ts`: import + call `registerOpenCommand`
   - `src/mcp/server.ts`: import + call `registerOpenTools`

6. Tests (unit + integration):
   - ID prefix parsing
   - URL construction
   - Error cases (unknown ID, invalid port)
   - Entity resolution

## Out of scope

- Auto-starting `backlog browser` if server is not running (v2 feature)
- GUI "Open in Browser" button in WebUI (separate task)
- Share link / copy-to-clipboard (separate task)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 CLI: backlog open BACK-531 -> resolves task, constructs URL http://localhost:6420/tasks/531/slug, opens browser
- [ ] #2 #2 CLI: backlog open doc-007 -> resolves doc, constructs URL http://localhost:6420/documentation/007/slug, opens browser
- [ ] #3 #3 CLI: backlog open decision-003 -> resolves decision, constructs URL http://localhost:6420/decisions/003/slug, opens browser
- [ ] #4 #4 CLI: backlog open with unknown ID -> clear error message
- [ ] #5 #5 CLI: uses configured defaultPort from config.yml (fallback 6420)
- [ ] #6 #6 CLI: backlog open --port 7654 BACK-531 -> uses custom port
- [ ] #7 #7 MCP: backlog_open_in_browser tool exists, accepts {id: string, port?: number}, returns {url: string}
- [ ] #8 #8 Entity type detection works via ID prefix: BACK-* / back-* = task, doc-* = document, decision-* = decision
- [ ] #9 #9 Platform-aware browser opening (open / xdg-open / cmd start)
- [ ] #10 #10 All tests green + tsc + biome
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 CLI: bun run cli open BACK-531 opens correct URL in browser
- [ ] #5 MCP: backlog_open_in_browser tool registered and returns opened URL
<!-- DOD:END -->
