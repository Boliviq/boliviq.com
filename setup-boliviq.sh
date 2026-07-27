#!/usr/bin/env bash
# Boliviq one-shot local setup.
# Run this from inside the unzipped boliviq-repaired/ folder ON YOUR OWN MACHINE.
# It will: init git -> push to a new GitHub repo -> install deps -> start the dev server.
set -euo pipefail

REPO="${1:-Boliviq/boliviq-professional-redesign}"   # override: ./setup-boliviq.sh Org/repo-name
VISIBILITY="${2:-private}"                            # private | public

echo "==> 1/4  Initializing git"
if [ ! -d .git ]; then
  git init -q
  git add -A
  git commit -q -m "Import boliviq professional redesign (2026-07-15 build)"
  git branch -M main
else
  echo "    .git already exists, skipping init"
fi

echo "==> 2/4  Creating + pushing GitHub repo: $REPO ($VISIBILITY)"
if command -v gh >/dev/null 2>&1; then
  gh repo create "$REPO" --"$VISIBILITY" --source=. --remote=origin --push
else
  echo "    gh CLI not found. Create the repo manually, then run:"
  echo "      git remote add origin git@github.com:$REPO.git"
  echo "      git push -u origin main"
fi

echo "==> 3/4  Installing dependencies"
if command -v bun >/dev/null 2>&1; then
  bun install
elif command -v npm >/dev/null 2>&1; then
  npm ci
else
  echo "    Need bun or npm installed. Aborting."; exit 1
fi

echo "==> Reminder: copy .env.example to .env.local and fill in Supabase/Stripe keys"
[ -f .env.local ] || cp .env.example .env.local

echo "==> 4/4  Starting dev server (watch the printed http://localhost:... URL)"
if command -v bun >/dev/null 2>&1; then bun dev; else npm run dev; fi
