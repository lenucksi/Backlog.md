#!/usr/bin/env bash
set -euo pipefail

sh -c 'command -v bun2nix >/dev/null 2>&1 && bun2nix -o bun.nix || (command -v nix >/dev/null 2>&1 && nix --extra-experimental-features "nix-command flakes" run github:baileyluTCD/bun2nix/85d692d68a5345d868d3bb1158b953d2996d70f7 -- -o bun.nix || true)'
