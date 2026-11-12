# razodin137 house style

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

The configurations is based on @eslint/js's [recommended](https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js) config,
with a few more stylistic and correctness rules added to reflect our preferences.

It also wires in the `unused-imports` plugin so that `eslint --fix` deletes unused imports; a `_` prefix marks variables that are unused on purpose.

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

## CSS

We use [Stylelint](https://stylelint.io) for our CSS. You'll need Stylelint 17 or higher to use our shared config.

Our config extends [stylelint-config-recommended](https://github.com/stylelint/stylelint-config-recommended) and makes it a little more lax.

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

## Formatting

What the formatter owns stays out of the linter, so nothing fights the fixer. Stylelint's own formatting rules are deprecated, and [Prettier](https://prettier.io) is their recommended replacement, so we use it to format our CSS and SCSS. You'll need Prettier 3 or higher to use our shared config, which requires Node 20.19 or newer.

HTML and JavaScript are deliberately out of scope. Prettier always writes void elements as `<br />` with no option to omit the slash, which would fight our html-validate `void-style: omit` rule, so never point it at `.html` files. And it can't express the house's spaced array brackets, so never point it at `.js` files either — those stay with the `@stylistic/js` rules and `eslint --fix`.

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

