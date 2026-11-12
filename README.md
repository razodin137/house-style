# 37signals house style

## Ruby

RuboCop has built-in support for pulling config from a gem. We provide a
`rubocop-37signals` gem for this purpose.

To introduce our house style to an app, add `rubocop-37signals` to your Gemfile:
```ruby
gem "rubocop-37signals", github: "razodin137/house-style", require: false
```

And create a boilerplate `.rubocop.yml` that inherits from `rubocop-37signals`:
```yaml
# 37signals house style
inherit_gem: { rubocop-37signals: rubocop.yml }
```

### For non-Rails apps:
```yaml
# 37signals house style
inherit_gem: { rubocop-37signals: rubocop-ruby.yml }
```

App-specific config may follow, overriding the house style.

## JavaScript

We use [ESLint](https://eslint.org) for our JavaScript. You'll need eslint 10 or higher to use our shared config, which requires Node 20.19 or newer.

The configurations is based on @eslint/js's [recommended](https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js) config,
with a few more stylistic rules added to reflect our preferences.

To use our ruleset as a baseline, add the `@37signals/eslint-config` package:

```bash
npm install --save-dev @37signals/eslint-config
```

Or with Yarn:

```bash
yarn add --dev @37signals/eslint-config
```

And extend it in your eslint.config.mjs file:

```js
import houseStyle from "@37signals/eslint-config"

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

To use our small ruleset as a baseline, add the `@37signals/stylelint-config-css` package:
```bash
npm install --save-dev @37signals/stylelint-config-css

# or
yarn add --dev @37signals/stylelint-config-css
```
And extend it in your Stylelint config:
```json
{
  "extends": "@37signals/stylelint-config-css",

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

To use our small ruleset as a baseline, add the `@37signals/stylelint-config-scss` package:
```bash
npm install --save-dev @37signals/stylelint-config-scss

# or
yarn add --dev @37signals/stylelint-config-scss
```
And extend it in your Stylelint config:
```json
{
  "extends": "@37signals/stylelint-config-scss",

  "rules": {
    …
  }
}
```

## HTML

We use [html-validate](https://html-validate.org) for our HTML. You'll need html-validate 11 or higher to use our shared config, which requires Node 22.22 or newer.

The configuration is based on the [recommended preset](https://html-validate.org/rules/presets.html), with a few more rules added to reflect our preferences.

To see the rules, read the [config itself](/html-validate-config/index.js).

To use our ruleset as a baseline, add the `@37signals/html-validate-config` package:
```bash
npm install --save-dev @37signals/html-validate-config

# or
yarn add --dev @37signals/html-validate-config
```

And extend it in your `.htmlvalidate.json`:
```json
{
  "extends": [ "@37signals/html-validate-config" ],

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

