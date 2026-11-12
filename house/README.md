# @razodin137/house

One house check binary. It discovers the lanes a repository actually has — by file type — and runs the right tools for each one.

```bash
npm install --save-dev @razodin137/house

npx house check
npx house fix
```

`house check` reports without writing. `house fix` is the cleanup command: it applies each lane's fixers and then re-runs the checks, so an unfixable violation still fails.

## Fixing locally

Run `house fix` before handing work over or opening a pull request:

```bash
house fix              # every file the runner can see
house fix src lib      # only these paths
house check            # the read-only gate CI should run
```

Fixers cover `eslint --fix`, `stylelint --fix`, `prettier --write`, `html-validate --fix`, `biome format --write`, `rubocop -a`, `shfmt -w`, and `ruff check --fix` plus `ruff format`. For `.html` files, `prettier --write` rewrites the contents of `<style>` and `<script>` blocks but never the markup. Exit `0` means the tree is clean, `1` means something remains that needs a source change, and `2` means a lane has files but no config or tool.

### Optional pre-commit hook

`house hook install` puts a pre-commit hook in the current clone:

```bash
house hook install
house hook install --force   # replace a hook another tool installed
```

The hook fixes only the files staged for the commit and stages the result. It never blocks the commit, and it skips the run when unstaged changes are present, so partially staged files cannot leak into the commit. That makes it a convenience, not a gate: keep `house check` in CI as the authoritative check. Hooks are per clone, so each contributor opts in; remove the hook file to uninstall, or bypass it with `git commit --no-verify`. Running `house hook install` again is safe and leaves the hook in place. It writes to `.git/hooks/pre-commit`, or to the directory named by `core.hooksPath` when the repository sets one.

## Lanes

Lanes are chosen by file type, not by language. That matters at the edges: a `.css` file is always checked with the CSS Stylelint config and never with the SCSS one, and an HTML project with no JavaScript still gets its HTML checked. The HTML lane formats embedded `<style>` and `<script>` bodies with Prettier, but never the markup: Prettier's lowercased doctype and `<br />` output would fight `doctype-style: uppercase` and `void-style: omit`.

| Lane     | Files                                                            | Check steps                                                          | Fix steps                                                                |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `js`     | `.js`, `.mjs`, `.cjs`, `.jsx`                                    | `eslint --max-warnings 0`                                            | `eslint --fix`, then check                                               |
| `css`    | `.css`                                                           | `prettier --check`, `stylelint`                                      | `stylelint --fix`, `prettier --write`, then check                        |
| `scss`   | `.scss`                                                          | `prettier --check`, `stylelint`                                      | `stylelint --fix`, `prettier --write`, then check                        |
| `html`   | `.html`, `.htm`                                                  | `html-validate`, `prettier --check` on embedded `<style>`/`<script>` | `html-validate --fix`, `prettier --write` on embedded blocks, then check |
| `md`     | `.md`, `.markdown`                                               | `biome format`                                                       | `biome format --write`, then check                                       |
| `yaml`   | `.yaml`, `.yml`                                                  | `biome format`                                                       | `biome format --write`, then check                                       |
| `ruby`   | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`, ruby shebangs | `rubocop`                                                            | `rubocop -a`, then check                                                 |
| `shell`  | `.sh`, `.bash`, `.zsh`, `.ksh`, shell shebangs                   | `shellcheck --severity=info`, `shfmt -i 2 -d`                        | `shfmt -i 2 -w`, then check                                              |
| `python` | `.py`, `.pyi`, python shebangs                                   | `ruff check`, `ruff format --check`                                  | `ruff check --fix`, `ruff format`, then check                            |

Ruby uses `bundle exec rubocop` when the project has a `Gemfile`.

## Config resolution

For each lane, `house` uses this order:

1. The project's own config (`eslint.config.*`, a stylelint config, a Prettier config, an html-validate config, `biome.json` or `biome.jsonc`, `.rubocop.yml`, `ruff.toml` or `[tool.ruff]` in `pyproject.toml`).
2. The matching `@razodin137/*` package installed in the project (`@razodin137/eslint-config`, `@razodin137/stylelint-config-css`, `@razodin137/stylelint-config-scss`, `@razodin137/prettier-config`, `@razodin137/html-validate-config`, `@razodin137/biome-config`).
3. For Ruby and Python only, the config bundled with `house` (`configs/rubocop-ruby.yml` and `configs/ruff.toml`).

The bundled Ruby and Python configs are copies of the gem and vendored configs; the test suite pins them so they cannot drift.

A lane with files but no config, or a lane whose tool is not installed, fails with exit code 2. It does not silently skip. The HTML lane resolves a Prettier config as well as an html-validate config, because it formats the embedded `<style>` and `<script>` bodies.

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
house hook install [--force]

-l, --lane <id>    only run these lanes (repeat or comma-separate)
    --list         show detected lanes and files, then exit
    --json         machine-readable result
    --verbose      print every command as it runs
    --color <when> auto, always, or never (default: auto)
-h, --help         show help
-V, --version      show the version
```

`house hook install` accepts `--force` to replace an existing hook and `--json` for a machine-readable result.

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

The tests run the real CLI against temporary projects with fake tools on `PATH`, so they pin lane detection, the CSS/SCSS split, config precedence, fix-then-verify order, embedded-block formatting, and exit codes without depending on the linters being installed.
