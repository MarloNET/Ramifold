#!/usr/bin/env bash
# Acceptance start from a clone (TechSpec 4.5, 6; Baseline section 11): ./start.sh <folder>
# Checks Node.js and Git, installs dependencies and builds when needed, then starts Ramifold for <folder>.
# Port via PORT; without Claude Code: RAMIFOLD_AGENT=fake ./start.sh <folder>.
# The variant without a folder (demo folder ./.demo/rag-projekt) follows with task #159.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -lt 1 ]; then
  echo "Usage: ./start.sh <folder>" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "start.sh: Node.js 24 or newer is required, but node was not found." >&2
  exit 1
fi
if [ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 24 ]; then
  echo "start.sh: Node.js 24 or newer is required, found $(node --version)." >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "start.sh: Git is required, but git was not found." >&2
  exit 1
fi

if [ ! -f "$ROOT/node_modules/.package-lock.json" ] || [ "$ROOT/package-lock.json" -nt "$ROOT/node_modules/.package-lock.json" ]; then
  (cd "$ROOT" && npm ci)
fi

SERVER="$ROOT/dist/server/ramifold-server.mjs"
if [ ! -f "$SERVER" ] || [ ! -f "$ROOT/dist/web/index.html" ] ||
  [ -n "$(find "$ROOT/src" "$ROOT/package-lock.json" "$ROOT/vite.config.ts" "$ROOT/vite.server.config.ts" -newer "$SERVER" -print -quit)" ]; then
  (cd "$ROOT" && npm run build)
fi

# Runs in the caller's folder, so a relative <folder> means the same as on the command line.
exec node "$ROOT/bin/ramifold.cjs" "$@"
