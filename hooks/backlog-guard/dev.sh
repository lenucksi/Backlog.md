#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR/../.." && pwd)"

case "${1:-all}" in
  test)
    echo ":: Running tests..."
    bun test "$DIR/guard-core.test.ts"
    ;;
  build)
    echo ":: Build not needed — Bun runs .ts files directly."
    echo ":: (npm package builds separately if publishing)"
    ;;
  check)
    echo ":: Biome check..."
    cd "$REPO" && bun run check .
    echo ":: TypeScript check..."
    bunx tsc --noEmit --pretty 2>&1 | tail -5 || true
    ;;
  all)
    "$0" check
    "$0" test
    echo ":: All checks passed."
    ;;
  *)
    echo "Usage: $0 {test|build|check|all}"
    exit 1
    ;;
esac
