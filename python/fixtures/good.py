#!/usr/bin/env python3
"""An example house-style gate: run the checks, keep a ledger, fail on trouble."""

import json
import subprocess
import sys


def check(name, command):
  result = subprocess.run(command, capture_output=True)
  if result.returncode == 0:
    print(f"ok   {name}")
  else:
    print(f"fail {name}")
  return result.returncode == 0


def main():
  checks = {
    "rubocop": ["bundle", "exec", "rubocop"],
    "eslint": ["npm", "run", "lint"],
    "stylelint": ["npx", "stylelint", "**/*.scss"],
  }
  ledger = {"passed": [], "failed": []}

  for name, command in checks.items():
    if check(name, command):
      ledger["passed"].append(name)
    else:
      ledger["failed"].append(name)

  print(json.dumps(ledger, indent=2))

  if ledger["failed"]:
    sys.exit(1)


if __name__ == "__main__":
  main()
