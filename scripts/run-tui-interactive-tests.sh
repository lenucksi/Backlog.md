#!/usr/bin/env bash
set -euo pipefail

echo "Running interactive TUI editor handoff tests..."
RUN_INTERACTIVE_TUI_TESTS=1 bun test src/test/tui-interactive-editor-handoff.test.ts --timeout=30000
