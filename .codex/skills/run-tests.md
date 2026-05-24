---
description: Run bun test — excludes worktrees via bunfig.toml, use test:fails for failure-only output
context: fork
model: haiku
---

bunfig.toml sets `pathIgnorePatterns = ["worktrees/*"]` — worktrees excluded automatically.

Run all tests:
```bash
bun test 2>&1
```

Run only failures:
```bash
bun run test:fails 2>&1
```

Return verbatim output. No commentary, no truncation, no summary. Worktrees excluded.
