#!/usr/bin/env bash
# 37signals house style for Python.
# ruff check gates on correctness (ruff's default rule set); ruff
# format pins the house formatting — double quotes, 2-space indent.
# Vendor this file with ruff.toml and gate with: ./lint.sh
set -euo pipefail

fix=false
files=()

while [[ $# -gt 0 ]]; do
  case "$1" in
  --fix)
    fix=true
    ;;
  -h | --help)
    echo "Usage: lint.sh [--fix] [file ...]"
    echo "  --fix  let ruff rewrite formatting and autofixable lint before checking"
    exit 0
    ;;
  *)
    files+=("$1")
    ;;
  esac
  shift
done

if [[ ${#files[@]} -eq 0 ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    listing=$(git ls-files --cached --others --exclude-standard -- "*.py")
  else
    listing=$(find . -name "*.py" -not -path "*/.git/*" -not -path "*/.venv/*" -not -path "*/node_modules/*")
  fi

  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      files+=("$file")
    fi
  done <<<"$listing"
fi

if [[ ${#files[@]} -eq 0 ]]; then
  echo "lint.sh: no python files found"
  exit 0
fi

if ! command -v ruff >/dev/null 2>&1; then
  echo "lint.sh: ruff is not installed (mise use ruff, or brew install ruff)" >&2
  exit 1
fi

status=0

if [[ "$fix" == true ]]; then
  ruff check --fix "${files[@]}" || status=1
  ruff format "${files[@]}" || status=1
else
  ruff check "${files[@]}" || status=1
  ruff format --check "${files[@]}" || status=1
fi

if [[ "$status" -eq 0 ]]; then
  echo "python: clean (${#files[@]} files)"
fi

exit "$status"
