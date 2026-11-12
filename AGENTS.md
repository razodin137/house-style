# Agent instructions

## Lint and fix a project

Install once per project. Lanes are picked by file type, so install only the lanes the project has. For an HTML/CSS app with no JavaScript:

```bash
git init && git add -A && git commit -m "before house fix"   # skip git init if already a repo, but commit first
npm init -y                                                  # skip if package.json exists
npm install --save-dev \
  /path/to/house-style/house \
  /path/to/house-style/stylelint-config-css \
  /path/to/house-style/prettier-config \
  /path/to/house-style/html-validate-config \
  stylelint prettier html-validate
```

Add the packages for the other lanes the project actually has: `/path/to/house-style/eslint-config` and `eslint` for JavaScript, `/path/to/house-style/stylelint-config-scss` in place of the CSS config for SCSS, and `/path/to/house-style/biome-config` plus `@biomejs/biome` for Markdown and YAML. The packages are not published to npm; install them by path.

Then loop until clean:

```bash
npx house fix
npx house check
```

`house fix` is the cleanup command; `house check` is the gate. A project may also have the optional pre-commit hook installed (`npx house hook install`), but it fixes only staged files and never blocks a commit, so it is not a substitute for running the loop.

## Rules

1. Fix the source. Never disable a rule, edit `node_modules`, or change a shared `@razodin137/*` config.
2. Repeat `house fix` then `house check` until `house check` exits `0`.
3. Exit `1` means violations remain; keep fixing. Exit `2` means a lane has files but no config or no tool: report which one, do not edit code.
4. `house fix` only clears rules that have a fixer. These need a source change: `no-duplicate-selectors` (merge the duplicate blocks), `no-descending-specificity` (move the less specific selector above the more specific one), and html-validate's `element-required-attributes`, `element-required-content`, `no-implicit-close`.
5. Keep the pre-fix commit, and report the diff. Do not commit unless asked.

## Working on this repository

- `npm test --workspaces --if-present` from the root runs every package's fixtures.
- Each package's fixtures are its contract: `good.*` passes, `bad.*` fails with the pinned rules. When a rule changes, update the fixture and the pinned list in that package's `test/verify.mjs`.
- `node house/bin/house.js check` exits `2` in this checkout by design: the repository installs no root lint config, and the `bad.*` fixtures are deliberately non-compliant. That is not a bug to fix.
