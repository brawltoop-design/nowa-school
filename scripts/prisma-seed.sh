#!/usr/bin/env bash

set -euo pipefail

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  NODE_BIN="/Users/aleksejmoskvin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi

exec "$NODE_BIN" ./node_modules/tsx/dist/cli.mjs prisma/seed.ts
