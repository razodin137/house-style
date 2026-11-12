#!/usr/bin/env bash
# Pins the house Python ruleset: good.py passes check and format
# clean; bad.py fails with exactly the pinned diagnostics while its
# planted unused argument stays silent (arguments are allowed to go
# unused, same as the JavaScript no-unused-vars with args: none);
# and the runner passes the good fixture through itself.
set -euo pipefail

cd "$(dirname "$0")/.."

fail() {
  echo "verify: $1" >&2
  exit 1
}

ruff check fixtures/good.py || fail "good.py should pass ruff check"
ruff format --check fixtures/good.py >/dev/null || fail "good.py should pass ruff format"

status=0
output=$(ruff check fixtures/bad.py 2>&1) || status=$?

if [[ "$status" -eq 0 ]]; then
  fail "bad.py should fail ruff check"
fi

found=$(grep -oE "[A-Z]+[0-9]+" <<<"$output" | sort -u)
expected="B006
F401
F821
F841
I001"

if [[ "$found" != "$expected" ]]; then
  fail "bad.py should pin exactly B006, F401, F821, F841 and I001, found:
$found"
fi

if ruff format --check fixtures/bad.py >/dev/null 2>&1; then
  fail "bad.py should fail ruff format"
fi

lint_output=$(./lint.sh fixtures/good.py 2>&1) || {
  echo "$lint_output" >&2
  fail "the runner should pass the good fixture clean"
}

echo "python: good.py clean; bad.py pinned (I001 import order, F401 unused import, B006 mutable default, F841 unused local, F821 undefined name, formatting); unused arguments stay silent; runner self-hosted"
