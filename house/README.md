# @razodin137/house

One house check binary. It discovers the lanes a repository actually has — by file type — and runs the right tools for each one.

```bash
npm install --save-dev @razodin137/house

npx house check
npx house fix
```

`house check` reports without writing. `house fix` is the cleanup command: it applies each lane's fixers and then re-runs the checks, so an unfixable violation still fails.

`house fix` also extracts inline `<style>` and executable `<script>` blocks into sibling `.css`/`.js` files before the lanes run, so those files are checked and formatted in the same invocation. `house check` never writes: it accepts inline blocks that Prettier already considers formatted, and fails unformatted ones with `run house fix`. Extraction is skipped by `--list`, by `signoff`, and when the html lane is not selected.

## Fixing locally

Run `house fix` before handing work over or opening a pull request:

```bash
house fix              # every file the runner can see
house fix src lib      # only these paths
house check            # the read-only gate CI should run
```

Fixers cover `eslint --fix`, `stylelint --fix`, `prettier --write`, `html-validate --fix`, `biome format --write`, `rubocop -a`, `shfmt -w`, and `ruff check --fix` plus `ruff format`. Inline HTML blocks are extracted first, and the new `.css`/`.js` files go through their own fixers in the same run. JSON-like blocks that stay inline are formatted in place with Prettier. Exit `0` means the tree is clean, `1` means something remains that needs a source change, and `2` means a lane has files but no config or tool.

### Optional pre-commit hook

`house hook install` puts a pre-commit hook in the current clone:

```bash
house hook install
house hook install --force   # replace a hook another tool installed
```

The hook fixes only the files staged for the commit and stages the result. It never blocks the commit, and it skips the run when unstaged changes are present, so partially staged files cannot leak into the commit. That makes it a convenience, not a gate: keep `house check` in CI as the authoritative check. Hooks are per clone, so each contributor opts in; remove the hook file to uninstall, or bypass it with `git commit --no-verify`. Running `house hook install` again is safe and leaves the hook in place. It writes to `.git/hooks/pre-commit`, or to the directory named by `core.hooksPath` when the repository sets one.

## Lanes

Lanes are chosen by file type, not by language. That matters at the edges: a `.css` file is always checked with the CSS Stylelint config and never with the SCSS one, and an HTML project with no JavaScript still gets its HTML checked. The HTML lane checks embedded `<style>` and `<script>` bodies with Prettier, but never reformats the markup: Prettier's lowercased doctype and `<br />` output would fight `doctype-style: uppercase` and `void-style: omit`. `house fix` extracts the CSS and JavaScript bodies into their own lanes and only formats the JSON-like blocks that stay inline.

| Lane     | Files                                                            | Check steps                                      | Fix steps                                                                            |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `js`     | `.js`, `.mjs`, `.cjs`, `.jsx`                                    | `eslint --max-warnings 0`                        | `eslint --fix`, then check                                                           |
| `css`    | `.css`                                                           | `prettier --check`, `stylelint`                  | `stylelint --fix`, `prettier --write`, then check                                    |
| `scss`   | `.scss`                                                          | `prettier --check`, `stylelint`                  | `stylelint --fix`, `prettier --write`, then check                                    |
| `html`   | `.html`, `.htm`                                                  | embedded block format check, `html-validate`     | extract CSS/JS, `html-validate --fix`, format remaining inline blocks, then check    |
| `md`     | `.md`, `.markdown`                                               | `biome format`                                   | `biome format --write`, then check                                                   |
| `yaml`   | `.yaml`, `.yml`                                                  | `biome format`                                   | `biome format --write`, then check                                                   |
| `ruby`   | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`, ruby shebangs | `rubocop`                                        | `rubocop -a`, then check                                                             |
| `shell`  | `.sh`, `.bash`, `.zsh`, `.ksh`, shell shebangs                   | `shellcheck --severity=info`, `shfmt -i 2 -d`    | `shfmt -i 2 -w`, then check                                                          |
| `python` | `.py`, `.pyi`, python shebangs                                   | `ruff check`, `ruff format --check`              | `ruff check --fix`, `ruff format`, then check                                        |

Ruby uses `bundle exec rubocop` when the project has a `Gemfile`.

## Inline CSS and JavaScript

The html lane treats embedded styles and executable scripts as code that belongs in its own lane. In one `house fix` run, each non-empty `<style>` or `<script>` block is written to a sibling file (for example `index.css` and `index.js`), the element is replaced with `<link rel="stylesheet" href="...">` or `<script src="..."></script>`, and the file list is regrouped so the new `.css`/`.js` files are linted and formatted by their own lanes. Subsequent blocks and name collisions are numbered `-2`, `-3`, and so on.

`house check` never writes, and it accepts either layout. Extracted files pass. So does a self-contained page whose inline blocks Prettier already considers formatted. An unformatted block fails the lane with exit 1 and `embedded <style> is not formatted; run house fix`. `house fix` still normalizes CSS and JavaScript to sibling files, so a self-contained page passes `house check` until the next `house fix`.

Keeping the extracted layout therefore means a project needs the css and js lane configs as well as the html one; `house fix` exits 2 after extraction if they are missing. Inline `application/json`, `application/ld+json`, import maps, speculation rules, template scripts, and scripts that already have `src` stay inline on purpose; the JSON-like ones are formatted in place.

The operation is also available on its own as `house extract` (`--check` is the default, `--write` extracts), but `house fix` is the normal entry point because it also runs the lanes.

## Config resolution

For each lane, `house` uses this order:

1. The project's own config (`eslint.config.*`, a stylelint config, a Prettier config, an html-validate config, `biome.json` or `biome.jsonc`, `.rubocop.yml`, `ruff.toml` or `[tool.ruff]` in `pyproject.toml`).
2. The matching `@razodin137/*` package installed in the project (`@razodin137/eslint-config`, `@razodin137/stylelint-config-css`, `@razodin137/stylelint-config-scss`, `@razodin137/prettier-config`, `@razodin137/html-validate-config`, `@razodin137/biome-config`).
3. For Ruby and Python only, the config bundled with `house` (`configs/rubocop-ruby.yml` and `configs/ruff.toml`).

The bundled Ruby and Python configs are copies of the gem and vendored configs; the test suite pins them so they cannot drift.

A lane with files but no config, or a lane whose tool is not installed, fails with exit code 2. It does not silently skip. The HTML lane needs a Prettier config and tool only when it actually has inline blocks to check or format; an HTML file with no blocks needs only the html-validate config.

## Files

With no arguments, `house` asks git for the files it tracks or would track (`git ls-files --cached --others --exclude-standard`), so `.gitignore` is honored. Outside a git repository it walks the tree. It always skips `node_modules`, `.git`, `vendor`, `dist`, `build`, `coverage`, `tmp`, `log`, `.venv`, `__pycache__`, and similar generated directories.

Pass paths to narrow the run:

```bash
house check src lib
house check --lane css,scss
```

## Options

```text
house check [options] [paths...]
house fix [options] [paths...]
house signoff [options] [paths...]
house extract [--check|--write] [paths...]
house hook install [--force]

-l, --lane <id>    only run these lanes (repeat or comma-separate)
    --list         show detected lanes and files, then exit
    --json         machine-readable result
    --verbose      print every command as it runs
    --color <when> auto, always, or never (default: auto)
-h, --help         show help
-V, --version      show the version
```

`house extract` accepts `--check` (the default) to report inline blocks without writing, or `--write` to extract them. `house hook install` accepts `--force` to replace an existing hook and `--json` for a machine-readable result.

Signoff options:

```text
    --context <name> sign off this context (repeat or comma-separate)
    --commit <rev>   sign off this commit instead of HEAD
    --url <url>      Details link for the status
-f, --force          sign off without checking the commit is pushed
    --fail           post gh signoff fail when the check fails
```

Exit codes: `0` clean, `1` checks failed, `2` configuration or tool error.

## Signoff

`house signoff` runs the lanes and, when they pass, posts a GitHub commit status through [gh-signoff](https://github.com/basecamp/gh-signoff). Install the extension once:

```bash
gh extension install basecamp/gh-signoff
```

Then let the check gate your merges:

```bash
house signoff tests lint
```

With no context it signs off the default `signoff` status. `--fail` reports a failing run with `gh signoff fail`, `--commit` and `--url` are forwarded to gh-signoff, and `-f` signs off without gh-signoff's pushed-commit check. A failed check posts nothing unless `--fail` is given, and a missing `gh` fails with exit 2 like any other missing tool.

## Development

```bash
npm test
```

The tests run the real CLI against temporary projects with fake tools on `PATH`, so they pin lane detection, the CSS/SCSS split, config precedence, fix-then-verify order, inline extraction and embedded-block checking, and exit codes without depending on the linters being installed.
