#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-6420}"
lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
