#!/usr/bin/env bash
# An example house-style gate: run the checks, keep a ledger, fail on trouble.
set -euo pipefail

passed=0
failed=0

check() {
  local name="$1"
  shift

  if "$@" >/dev/null 2>&1; then
    printf "ok   %s\n" "$name"
    passed=$((passed + 1))
  else
    printf "fail %s\n" "$name"
    failed=$((failed + 1))
  fi
}

check "rubocop" bundle exec rubocop
check "eslint" npm run lint
check "stylelint" npx stylelint "**/*.scss"

printf "ledger: %d passed, %d failed\n" "$passed" "$failed"

if [[ "$failed" -gt 0 ]]; then
  exit 1
fi
