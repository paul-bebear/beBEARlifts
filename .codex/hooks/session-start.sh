#!/bin/bash
# Prepares a fresh Claude Code cloud container. Adapted from shoriminimoe/liftosaur (AGPL-3.0), commit 07241ac79.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

if [ ! -d node_modules ]; then
  echo "==> npm ci"
  npm ci --no-audit --no-fund
fi

npm run ensure:localdomain

# src/generated/*.ts, theme.generated.css and the program data are gitignored codegen output.
# src/ imports them at require time, so without them no mocha test loads.
echo "==> codegen"
npm run build:markdown
npm run build:theme
npm run build:exercises
npm run build:programs

# MockFetch in the mocha suite reads /programdata/* from dist/, which webpack's CopyPlugin normally fills.
mkdir -p dist
rm -rf dist/programdata
cp -r programdata dist/programdata

echo "==> playwright chromium (headless iPhone checks)"
npx playwright install chromium || echo "playwright install failed; end-to-end checks need it"

echo "==> ready: npm test | npm run build:pwa"
