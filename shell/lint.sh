#!/usr/bin/env bash
# razodin137 house style for shell.
# ShellCheck gates at info severity (that's where 0.11 puts unquoted
# expansions — the bug that breaks gate scripts); style stays advisory.
# shfmt pins formatting to a 2-space indent. Vendor this file with
# .shellcheckrc and gate with: ./lint.sh
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
    echo "  --fix  let shfmt rewrite formatting before checking"
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
    listing=$(git ls-files --cached --others --exclude-standard -- "*.sh")
  else
    listing=$(find . -name "*.sh" -not -path "*/.git/*" -not -path "*/node_modules/*")
  fi

  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      files+=("$file")
    fi
  done <<<"$listing"
fi

if [[ ${#files[@]} -eq 0 ]]; then
  echo "lint.sh: no shell files found"
  exit 0
fi

for tool in shellcheck shfmt; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "lint.sh: $tool is not installed (mise use shellcheck shfmt, or brew install shellcheck shfmt)" >&2
    exit 1
  fi
done

status=0

if [[ "$fix" == true ]]; then
  shfmt -i 2 -w "${files[@]}" || status=1
  shellcheck --severity=info "${files[@]}" || status=1
else
  shellcheck --severity=info "${files[@]}" || status=1
  shfmt -i 2 -d "${files[@]}" || status=1
fi

if [[ "$status" -eq 0 ]]; then
  echo "shell: clean (${#files[@]} files)"
fi

exit "$status"
