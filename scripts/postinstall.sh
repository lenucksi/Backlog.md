#!/usr/bin/env bash
set -euo pipefail

sh -c 'command -v bun2nix >/dev/null 2>&1 && bun2nix -o bun.nix || (command -v nix >/dev/null 2>&1 && nix --extra-experimental-features "nix-command flakes" run github:baileyluTCD/bun2nix/85d692d68a5345d868d3bb1158b953d2996d70f7 -- -o bun.nix || true)'

# Patch chevrotain to fix Firefox "unreachable code after return" error.
# Bun's minifier constant-folds `if (1)` producing dead code after return.
TARGET="node_modules/@chevrotain/utils/lib/src/to-fast-properties.js"
PATCH="patches/chevrotain-to-fast-properties.patch"
if [ -f "$TARGET" ]; then
  patch -p0 -N -r- < "$PATCH" 2>/dev/null || true
fi
