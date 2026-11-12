import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, isAbsolute, resolve } from "node:path"

const MARKER = "# house: pre-commit hook"

export const hookScript = `#!/bin/sh
${MARKER}
#
# Optional local cleanup: run house fix on the files staged for this
# commit and stage whatever it rewrites. This hook never blocks a commit;
# house check in CI remains the authoritative gate.

set -u

# A fixer reads and writes the whole file, so a partially staged file
# would leak its unstaged hunks into the commit when we re-stage it.
if ! git diff --quiet --; then
  printf '%s\\n' "house: unstaged changes present, skipping autofix (stage everything to let the hook clean it)." >&2
  exit 0
fi

tmp=$(mktemp "\${TMPDIR:-/tmp}/house-staged.XXXXXX") || exit 0
trap 'rm -f "$tmp"' EXIT HUP INT TERM

git diff --cached --name-only --diff-filter=ACMR -z >"$tmp" || exit 0
[ -s "$tmp" ] || exit 0

xargs -0 npx --no-install house fix -- <"$tmp"
status=$?

xargs -0 git add -- <"$tmp"

if [ "$status" -ne 0 ]; then
  printf '%s\\n' "house: some staged files still need attention; CI will check the whole tree." >&2
fi

exit 0
`

function hookPath(cwd) {
  const result = spawnSync("git", [ "rev-parse", "--git-path", "hooks/pre-commit" ], {
    cwd,
    encoding: "utf8"
  })

  if (result.error || result.status !== 0) return null

  const found = result.stdout.trim()
  if (!found) return null

  return isAbsolute(found) ? found : resolve(cwd, found)
}

export function installHook(cwd, { force = false } = {}) {
  const path = hookPath(cwd)
  if (!path) return { status: "no-git", path: null }

  if (existsSync(path) && !force && !readFileSync(path, "utf8").includes(MARKER)) {
    return { status: "exists", path }
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, hookScript)
  chmodSync(path, 0o755)

  return { status: "installed", path }
}
