#!/usr/bin/env bash
# Pins the house shell ruleset: good.sh passes clean; bad.sh fails with the
# pinned violations while its planted style check stays silent (severity
# filtering); and the runner and test lint themselves clean.
set -euo pipefail

cd "$(dirname "$0")/.."

fail() {
  echo "verify: $1" >&2
  exit 1
}

shellcheck --severity=info fixtures/good.sh || fail "good.sh should pass shellcheck"
shfmt -i 2 -d fixtures/good.sh >/dev/null || fail "good.sh should pass shfmt"

status=0
output=$(shellcheck --severity=info fixtures/bad.sh 2>&1) || status=$?

if [[ "$status" -eq 0 ]]; then
  fail "bad.sh should fail shellcheck"
fi

found=$(grep -oE "SC[0-9]+ \((error|warning|info|style)\)" <<<"$output" | sort || true)
expected="SC2016 (info)
SC2086 (info)
SC2154 (warning)"

if [[ "$found" != "$expected" ]]; then
  fail "bad.sh should pin exactly SC2086, SC2154 and SC2016, found:
$found"
fi

if shfmt -i 2 -d fixtures/bad.sh >/dev/null 2>&1; then
  fail "bad.sh should fail shfmt formatting"
fi

lint_output=$(./lint.sh lint.sh test/verify.sh fixtures/good.sh 2>&1) || {
  echo "$lint_output" >&2
  fail "the house files themselves should lint clean"
}

echo "shell: good.sh clean; bad.sh pinned (SC2086 quoting, SC2154 unassigned, SC2016 single quotes, formatting); style stays advisory; runner and test self-hosted"
