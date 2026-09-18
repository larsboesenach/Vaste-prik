#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Geen Git-repository gevonden in $REPO_ROOT"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ Geen remote 'origin' gevonden. Voeg eerst een remote toe."
  exit 1
fi

DATE=$(date +"%d-%m-%Y")
COMMIT_MESSAGE="Wijzigingen van ${DATE} - Website update"

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "ℹ️ Geen wijzigingen om te committen."
  exit 0
fi

git add -A

git commit -m "$COMMIT_MESSAGE"

echo "🚀 Pushen naar origin/main..."
git push origin HEAD:main

echo "✅ Commit en push voltooid."
