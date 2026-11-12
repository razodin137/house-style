# razodin137 house style

## One runner

The command lives in the package, not in each project's AGENTS.md. `@razodin137/house` detects the lanes a repository actually has and runs each lane's tools:

```bash
npm install --save-dev @razodin137/house

npx house check
npx house fix
```

The packages are not published to npm yet: the command above works once they are, and until then a project installs the runner and each lane's config from a checkout by path. The file types decide the install: a project of `.css` and `.html` files needs only those two lanes, and installing the JS packages would change nothing.

```bash
npm install --save-dev \
  /path/to/house-style/house \
  /path/to/house-style/stylelint-config-css \
  /path/to/house-style/prettier-config \
  /path/to/house-style/html-validate-config \
  stylelint prettier html-validate
```

`house check` exits `0` when every lane passes, `1` when a rule fails, and `2` when a lane has files but no config or no tool.

Lanes are picked by file type, not by language:

| Lane     | Files                                                            | Runs                                                                                |
| -------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `js`     | `.js`, `.mjs`, `.cjs`, `.jsx`                                    | ESLint with `@razodin137/eslint-config`, `--max-warnings 0`                         |
| `css`    | `.css`                                                           | Stylelint with `@razodin137/stylelint-config-css`, then Prettier                    |
| `scss`   | `.scss`                                                          | Stylelint with `@razodin137/stylelint-config-scss`, then Prettier                   |
| `html`   | `.html`, `.htm`                                                  | embedded block format check, then html-validate with `@razodin137/html-validate-config` |
| `md`     | `.md`, `.markdown`                                               | Biome with `@razodin137/biome-config`                                               |
| `yaml`   | `.yaml`, `.yml`                                                  | Biome with `@razodin137/biome-config`                                               |
| `ruby`   | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`, ruby shebangs | RuboCop, via `bundle exec` when a `Gemfile` is present                              |
| `shell`  | `.sh`, `.bash`, `.zsh`, `.ksh`, shell shebangs                   | ShellCheck at info severity, then shfmt                                             |
| `python` | `.py`, `.pyi`, python shebangs                                   | `ruff check`, then `ruff format --check`                                            |

A `.css` file never goes through the SCSS config and a `.scss` file never goes through the CSS config: each lane gets its own config. An HTML-only project with no inline blocks runs the HTML lane without needing a JS lane.

The html lane extracts embedded CSS and JavaScript into linked files, so inline code is held to the same rules as code in its own file. `house fix` does the extraction and then runs every lane against the new files in the same invocation. `house check` never writes and accepts either layout: extracted files pass, and so does a self-contained page whose inline blocks are already formatted; only unformatted blocks fail with a "run house fix" message. Keeping the extracted layout means a page needs the css and js lane configs as well as the html one. Inline JSON, JSON-LD, import maps, speculation rules, template scripts, and scripts that already have `src` stay inline; the JSON-like ones are formatted in place.

Project config wins. When a project has no `eslint.config.*`, stylelint config, Prettier config, html-validate config, or Biome config, the lane uses the matching `@razodin137/*` package installed in the project. Ruby and Python fall back to configs bundled with `house`. A missing tool or missing config fails loudly with exit 2 instead of skipping the lane.

## Fixing locally

`house fix` is the cleanup command: it extracts inline HTML blocks, applies every lane's fixer, and then re-runs the checks, so the tree it reports on is the tree it actually wrote. `house check` stays the read-only gate that CI runs: it reports inline blocks instead of extracting them, and exits `1` until `house fix` has run.

```bash
npx house fix              # clean up every file house can see
npx house fix src          # only a subtree or a list of files
npx house check            # report only; this is the CI gate
```

It exits `0` when the tree is clean, `1` when a violation remains that has no fixer, and `2` when a lane has files but no config or tool. A few rules need a source change rather than a rewrite: Stylelint's `no-duplicate-selectors` (merge the duplicate blocks) and `no-descending-specificity` (move the less specific selector above the more specific one), and html-validate's `element-required-attributes`, `element-required-content`, and `no-implicit-close`. Run `house fix` again after making the change.

### Optional pre-commit hook

To clean staged files automatically, install the hook once per clone:

```bash
npx house hook install          # writes the hook into .git/hooks
npx house hook install --force  # replace a hook another tool installed
```

The hook runs `house fix` on the files staged for the commit, stages whatever the fixers rewrote, and never blocks the commit. It is deliberately permissive: `house check` in CI remains the authoritative gate, so the hook only saves a round trip. It skips the run when the working tree has unstaged changes, because a fixer rewrites the whole file and re-staging it would pull those hunks into the commit. When the repository sets `core.hooksPath`, the hook goes in that directory instead.

Hooks live in the clone, not in the repository, so each contributor opts in. Delete `.git/hooks/pre-commit` to stop; `git commit --no-verify` bypasses it for one commit.

The install-and-fix loop to hand an agent, including the rules `house fix` cannot clear, is written down in [AGENTS.md](/AGENTS.md).

## Signoff

A check that only runs locally cannot gate a merge. `house signoff` is the local-CI half: it runs the same lanes and, when they pass, posts a GitHub commit status through [gh-signoff](https://github.com/basecamp/gh-signoff).

```bash
gh extension install basecamp/gh-signoff

npx house signoff tests lint
```

Contexts are optional; with none it signs off the bare `signoff` status. `--fail` reports a failing run with `gh signoff fail`, `--commit` and `--url` are forwarded to gh-signoff, and `-f` overrides its pushed-commit check. A failed check posts nothing unless `--fail` is given, and a missing `gh` fails with exit 2 like any other missing tool.

## Ruby

RuboCop has built-in support for pulling config from a gem. We provide a
`rubocop-razodin137` gem for this purpose.

To introduce our house style to an app, add `rubocop-razodin137` to your Gemfile:

```ruby
gem "rubocop-razodin137", github: "razodin137/house-style", require: false
```

And create a boilerplate `.rubocop.yml` that inherits from `rubocop-razodin137`:

```yaml
# razodin137 house style
inherit_gem: { rubocop-razodin137: rubocop.yml }
```

### For non-Rails apps:

```yaml
# razodin137 house style
inherit_gem: { rubocop-razodin137: rubocop-ruby.yml }
```

App-specific config may follow, overriding the house style.

## JavaScript

We use [ESLint](https://eslint.org) for our JavaScript. You'll need eslint 10 or higher to use our shared config, which requires Node 20.19 or newer.

The config is based on @eslint/js's [recommended](https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js) config,
with a few more correctness rules added to reflect our preferences: `no-use-before-define` for variables, `no-unneeded-ternary`, `no-useless-return`, `one-var` for initialised declarations, and the rest of the list in [the config itself](/eslint-config/eslint.config.mjs).

Formatting comes from @stylistic's `customize` preset rather than a hand-picked subset, with the disagreements overridden: spaced array brackets, no trailing commas, arrow parameters always parenthesised, double quotes that fall back to single only to avoid escaping, operators at the end of the line rather than the start, and `quote-props` off. That last one is off because our JS quotes object keys in option objects on purpose, and every setting of the rule flags exactly that convention. Browser, Node, and ES2021 globals are all enabled, so a Node CLI lints without `no-undef` noise.

It also wires in five plugins. `unused-imports` makes `eslint --fix` delete unused imports, with `_` marking variables unused on purpose; `unicorn` adds a small correctness set such as `prefer-node-protocol`, `throw-new-error`, and `prefer-includes`; `import` (`eslint-plugin-import-x`, plus `eslint-import-resolver-node`) brings the resolution rules `import-lite` cannot express: `no-unresolved`, `named`, `no-cycle`, `no-extraneous-dependencies`, `no-self-import`, `no-useless-path-segments`. Its `extensions` rule is inverted from airbnb's: `.js` and `.mjs` imports must keep their extension, because Node ESM requires it. `react-hooks` adds `rules-of-hooks` and `exhaustive-deps` for JSX files, and `eslint-comments/no-unlimited-disable` makes a bare `/* eslint-disable */` an error.

The remaining additions come from airbnb's config, which has no ESLint 10 flat-config build and so can only be read as a rule list: its correctness rules (`no-shadow`, `consistent-return`, `no-param-reassign` without property tracking, `no-loop-func`, `no-return-assign`, `no-else-return`), its modernisation set (`object-shorthand`, `prefer-template`, `prefer-spread`, `prefer-object-spread`), and its opinions (`no-plusplus`, `no-continue`, `no-nested-ternary`, `no-bitwise`, `camelcase`, `class-methods-use-this`, `prefer-destructuring`, `no-lonely-if`, `vars-on-top`, `yoda`). `no-plusplus` keeps the for-loop afterthought allowed; the rest are taken as written.

To use our ruleset as a baseline, add the `@razodin137/eslint-config` package:

```bash
npm install --save-dev @razodin137/eslint-config
```

Or with Yarn:

```bash
yarn add --dev @razodin137/eslint-config
```

And extend it in your eslint.config.mjs file:

```js
import houseStyle from "@razodin137/eslint-config"

export default [
  houseStyle,
  {
    rules: {
      "no-unused-vars": [ "off" ]
      ...
    }
  }
]

```

The [fixtures](/eslint-config/fixtures) pin the ruleset: `good.js` and `good.jsx` pass clean, `unformatted.js` and `unformatted.jsx` reformat to exactly their pinned good output, and `bad.js` fails with at least one violation per rule that can fire in module JavaScript. The rules that cannot fire there — the TypeScript stylistic rules, and the ones whose violations are parse-time errors in strict mode — are listed with their reasons in the test. Run them from the package directory with `npm test`.

## CSS

We use [Stylelint](https://stylelint.io) for our CSS. You'll need Stylelint 17 or higher to use our shared config.

Our config extends [stylelint-config-recommended](https://github.com/stylelint/stylelint-config-recommended), turns off its empty-comment rule, and adds three correctness rules it leaves out: nonstandard gradient directions, unknown functions, and unknown units.

To see the rules, read the [config itself](/stylelint-config-css/index.js).

To use our small ruleset as a baseline, add the `@razodin137/stylelint-config-css` package:

```bash
npm install --save-dev @razodin137/stylelint-config-css

# or
yarn add --dev @razodin137/stylelint-config-css
```
And extend it in your Stylelint config:

```json
{
  "extends": "@razodin137/stylelint-config-css",

  "rules": {
    …
  }
}
```

The [fixtures](/stylelint-config-css/fixtures) pin the ruleset: `good.css` passes clean, and `bad.css` fails with one violation per rule. Run them from the package directory with `npm test`.

`house fix` runs Stylelint's fixer, so it only clears rules that have one. `no-duplicate-selectors` and `no-descending-specificity` do not: the first needs two blocks merged, and the second needs the less specific selector moved above the more specific one. `house fix` reports them unchanged and `house check` keeps failing until the source changes.

## Design tokens

The CSS and SCSS configs check syntax. They cannot tell you that a colour or a font came from somewhere other than the token sheet — "every colour and font comes through a token" is a design rule, not a parse rule.

`@razodin137/stylelint-config-tokens` adds that lane. It is syntax-agnostic, so it layers over either config:

```bash
npm install --save-dev @razodin137/stylelint-config-tokens
```

```json
{
  "extends": [
    "@razodin137/stylelint-config-css",
    "@razodin137/stylelint-config-tokens"
  ],

  "rules": {
    …
  }
}
```

Swap in `@razodin137/stylelint-config-scss` for an SCSS project; the token rules are the same.

Two rules do the work. `scale-unlimited/declaration-strict-value` requires `var()` for every colour property (matched by name, vendor prefixes included), plus `fill`, `stroke`, and `font-family`. Values with their own meaning — `inherit`, `currentColor`, `transparent`, `none` — still pass, and `@font-face` may name the family it defines. Token definitions themselves are exempt, so a raw value is legal exactly once, where the token is declared.

`custom-property-pattern` keeps the vocabulary fixed: custom properties must be `--color-*`, `--space-*`, or `--text-*`. Widen the pattern in your project config when you add a namespace such as `--radius-*`.

The [fixtures](/stylelint-config-tokens/fixtures) pin the lane: `good.css` passes clean, and `bad.css` fails with one violation per rule. Run them from the package directory with `npm test`.

## SCSS

We use [Stylelint](https://stylelint.io) for our SCSS. You'll need Stylelint 17 or higher to use our shared config.

Our config extends [stylelint-config-recommended-scss](https://github.com/stylelint-scss/stylelint-config-recommended-scss) and makes it a little more lax.

To see the rules, read the [config itself](/stylelint-config-scss/index.js).

To use our small ruleset as a baseline, add the `@razodin137/stylelint-config-scss` package:

```bash
npm install --save-dev @razodin137/stylelint-config-scss

# or
yarn add --dev @razodin137/stylelint-config-scss
```
And extend it in your Stylelint config:

```json
{
  "extends": "@razodin137/stylelint-config-scss",

  "rules": {
    …
  }
}
```

## Markdown, YAML, and HTML

We use [Biome](https://biomejs.dev) to format Markdown and YAML, and to lint HTML accessibility. You'll need Biome 2.6 or higher — the shared config ships as a [Biome manifest](https://biomejs.dev/guides/publish-packages/#publish-biome-configurations).

Biome formats Markdown and YAML, and lints HTML and JSX for the accessibility rules html-validate cannot express. It does not format HTML: Biome writes void elements as `<br />`, which would fight our html-validate `void-style: omit` rule. JavaScript still stays with ESLint, CSS and SCSS with Prettier, and HTML structure and validity with html-validate. The shared config enables Biome only for those jobs, so `biome check .` never fights the others.

`@razodin137/house` runs the same Biome config for the `md` (`.md`, `.markdown`) and `yaml` (`.yaml`, `.yml`) lanes, so `house check` and `house fix` cover those files in the same pass as every other lane.

To use our ruleset as a baseline, add the `@razodin137/biome-config` package:

```bash
npm install --save-dev @razodin137/biome-config @biomejs/biome
```

Or with Yarn:

```bash
yarn add --dev @razodin137/biome-config @biomejs/biome
```

And extend it in your `biome.json`:

```json
{
  "extends": [ "@razodin137/biome-config/configs/recommended" ]
}
```

Gate formatting and accessibility linting from your package scripts:

```json
{
  "scripts": {
    "format:check": "biome format .",
    "format": "biome format --write .",
    "lint:a11y": "biome lint ."
  }
}
```

The [fixtures](/biome-config/fixtures) pin the ruleset: `good.{md,yaml}` pass clean, `bad.{md,yaml}` reformat to exactly their pinned good output, `good.html` passes lint, and `bad.html` fails with all 28 expected accessibility rules, one violation each. The deliberately off-style `ignored.js` is left alone. Run them from the package directory with `npm test`.

## Formatting

What the formatter owns stays out of the linter, so nothing fights the fixer. Stylelint's own formatting rules are deprecated, and [Prettier](https://prettier.io) is their recommended replacement, so we use it to format our CSS and SCSS. You'll need Prettier 3 or higher to use our shared config, which requires Node 20.19 or newer.

HTML markup and JavaScript are deliberately out of scope. Prettier always writes void elements as `<br />` with no option to omit the slash, and it lowercases `<!DOCTYPE html>`; both would fight our html-validate `void-style: omit` and `doctype-style: uppercase` rules. So never point it at the HTML markup. The HTML lane does use Prettier on the _contents_ of `<style>` and `<script>` blocks in `.html` files, which is where a self-contained page keeps its CSS and JS, while the markup stays with html-validate. `house fix` extracts the CSS and JavaScript into their own lanes first, then formats the JSON-like blocks that stay inline. Blocks with a `src`, an unsupported `type`, or content Prettier cannot parse are left untouched. And Prettier can't express the house's spaced array brackets, so never point it at `.js` files either — those stay with the `@stylistic/js` rules and `eslint --fix`.

To use our defaults, add the `@razodin137/prettier-config` package and reference it from `package.json`:

```bash
npm install --save-dev prettier @razodin137/prettier-config
```

```json
{
  "prettier": "@razodin137/prettier-config"
}
```

Editor plugins pick that key up automatically. Then gate formatting on the two file types:

```json
{
  "scripts": {
    "format:check": "prettier --check \"**/*.{css,scss}\"",
    "format": "prettier --write \"**/*.{css,scss}\""
  }
}
```

The [fixtures](/prettier-config/fixtures) pin the defaults: `good.{css,scss}` are already formatted, and Prettier rewrites `bad.{css,scss}` into exactly their pinned good output — 2-space indent, double quotes, lines reflowed at 80. Run them from the package directory with `npm test`.

## HTML

We use [html-validate](https://html-validate.org) for our HTML. You'll need html-validate 11 or higher to use our shared config, which requires Node 22.22 or newer.

The configuration is based on the [recommended preset](https://html-validate.org/rules/presets.html), with a few more rules added to reflect our preferences.

Four of those additions are accessibility checks drawn from the vendored [Basecamp accessibility guide](/accessibility/README.md): semantic heading order, labelled inputs, resolvable `for` and `aria-labelledby` references, and inline SVGs kept out of the tab order. The rest of that guide is vendored as reference, not as a ruleset — keyboard order, focus visibility, colour contrast on rendered pages, and screen-reader comprehension need a person, not a linter.

house checks the embedded CSS and JavaScript too, but not by formatting the HTML string. `house fix` writes each inline `<style>` and executable `<script>` block to a sibling `.css` or `.js` file, replaces it with a `<link>` or `src` script, and then lets the css and js lanes format and lint those files in the same run. `house check` refuses to write but accepts either layout: extracted files pass, and so does a self-contained page whose inline blocks are already Prettier-formatted. Only an unformatted block fails, with `embedded <style> is not formatted; run house fix`. Keeping the extracted layout needs the css and js lane configs in addition to the html one.

To see the rules, read the [config itself](/html-validate-config/index.js).

To use our ruleset as a baseline, add the `@razodin137/html-validate-config` package:

```bash
npm install --save-dev @razodin137/html-validate-config

# or
yarn add --dev @razodin137/html-validate-config
```

And extend it in your `.htmlvalidate.json`:

```json
{
  "extends": [ "@razodin137/html-validate-config" ],

  "rules": {
    …
  }
}
```

The [fixtures](/html-validate-config/fixtures) pin the ruleset: `good.html` passes clean, and `bad.html` fails with one violation per rule. Run them from the package directory with `npm test`.

For self-contained pages, `house check` verifies the contents of `<style>` and `<script>` blocks with Prettier, using the same Prettier config resolution as the CSS lanes, and `house fix` formats the JSON-like blocks that remain after extraction. It never reformats the markup, so the uppercase doctype and `void-style: omit` rules stay authoritative. Blocks with a `src`, an unsupported `type`, or content Prettier cannot parse are skipped.

## Screenshots

Text linters cannot see a layout. A page can pass every rule above and still collapse at 390px, with a day label printing on top of its sentence. `@razodin137/shot` renders the page and compares it with a baseline at 390, 1280, 1440, and 1920.

Install the command and its browser:

```bash
npm install --save-dev @razodin137/shot
npx playwright install chromium
```

Point it at a running site, or at local files:

```bash
npx house-shot http://localhost:3000/ --base-url http://localhost:3000
```

Add a `shot.config.mjs` for the usual pages:

```js
export default {
  baseURL: "http://localhost:3000",
  pages: [ "/", "/pricing" ],
  widths: [ 390, 1280, 1440, 1920 ],
  out: ".shot",
  tolerance: 0.001
}
```

The first run establishes baselines with `--update`; commit `.shot/`. Every later run compares each page at each width, writes `<width>.actual.png` and `<width>.diff.png` beside the failing baseline, and exits non-zero. `--tolerance` is the allowed ratio of differing pixels, 0.1% by default, so font anti-aliasing does not trip the gate while a moved box does.

Shots are deterministic by construction: one device pixel per CSS pixel, light colour scheme, reduced motion, animations and transitions disabled, web fonts awaited before capture. Baselines still belong to the machine that drew them — regenerate them in the same container or CI image rather than across operating systems.

The [fixtures](/shot/fixtures) pin the command: `good` and `bad` render identically at 1280 and up, while `bad` overprints its day labels at 390. `bad` is `good` with one mobile rule left behind — the row collapses, the children keep spanning. The test builds its baselines in `.test-output` at run time, so the package ships no screenshots that would only match one OS. Run it from the package directory with `npm test`.

## Shell

We use [ShellCheck](https://www.shellcheck.net) for linting and [shfmt](https://github.com/mvdan/sh) for formatting our shell scripts. They're plain binaries — no Node required — so install them with your usual tool manager (`mise use shellcheck shfmt`, or brew). You'll need ShellCheck 0.11 or higher and shfmt 3 or newer; the fixtures run against the versions pinned in [mise.toml](/shell/mise.toml).

ShellCheck catches what breaks gate scripts: quoting and word splitting, unassigned variables, missing shebangs. Modern ShellCheck grades severity by context, so we gate at info severity — that's where the unquoted-expansion checks live — and style checks stay advisory (see [`lint.sh`](/shell/lint.sh)). shfmt pins standard formatting with the house 2-space indent, and `lint.sh --fix` lets it rewrite files first.

There's no config registry for shell tools, so adoption is vendoring: copy [`lint.sh`](/shell/lint.sh) and [`.shellcheckrc`](/shell/.shellcheckrc) into your project root — the rc is where project-level disables go, and editor plugins honor it too — then gate with `./lint.sh`. Merge the [`.editorconfig`](/shell/.editorconfig) section into your project's so editors match.

The [fixtures](/shell/fixtures) pin the ruleset: `good.sh` passes clean, and `bad.sh` fails with the pinned violations while its planted style check stays silent. Run them from the directory with `./test/verify.sh`.

## Python

We use [Ruff](https://docs.astral.sh/ruff/) for our Python. It's a single binary — no Node, no gem — so install it with your usual tool manager (`mise use ruff`, or brew). You'll need ruff 0.17 or newer; the fixtures run against the version pinned in [mise.toml](/python/mise.toml).

Ruff does both jobs: `ruff format` pins the house DNA — double quotes, 2-space indent, instead of Black's 4 — and `ruff check` gates on ruff's own default rule set, kept deliberately: pyflakes plus a curated slice of correctness rules (bugbear, isort, pyupgrade). What the formatter owns stays out of the linter, so nothing fights the fixer, and unused arguments stay allowed, same as the JavaScript `no-unused-vars` with `args: none`. The one relaxation is PLW1510 — gate scripts read returncodes on purpose (see [`ruff.toml`](/python/ruff.toml)).

There's no config registry for ruff either, so adoption is vendoring: copy [`ruff.toml`](/python/ruff.toml) into your project root — it's where project overrides go, and editor plugins honor it too — and [`lint.sh`](/python/lint.sh) if you want the gate wired up, then gate with `./lint.sh` (`--fix` lets ruff rewrite first). Merge the [`.editorconfig`](/python/.editorconfig) section into your project's so editors match.

The [fixtures](/python/fixtures) pin the ruleset: `good.py` passes clean, and `bad.py` fails with the pinned diagnostics while its planted unused argument stays silent. Run them from the directory with `./test/verify.sh`.

## Development

The packages are npm workspaces. Run every package's fixtures from the repository root:

```bash
npm test --workspaces --if-present
```

The repository installs no root lint config of its own, so running the runner against this checkout (`node house/bin/house.js check`) exits `2` rather than linting itself. The packages are the product, and their `bad.*` fixtures are deliberately non-compliant.
