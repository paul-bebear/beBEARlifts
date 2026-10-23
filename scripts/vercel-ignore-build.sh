#!/bin/bash
# Vercel's ignoreCommand contract: exit 0 skips the build, exit 1 runs it.

if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[skip deploy]"* ]]; then
  echo "Skipped: the commit message asks to skip the deploy."
  exit 0
fi

if [[ "$VERCEL_ENV" == "preview" && "$VERCEL_GIT_COMMIT_REF" != preview/* ]]; then
  echo "Skipped: previews build only for branches named preview/*."
  exit 0
fi

if git diff --quiet HEAD^ HEAD -- . ':(exclude)*.md' 2>/dev/null; then
  echo "Skipped: the commit changes only Markdown files."
  exit 0
fi

exit 1
