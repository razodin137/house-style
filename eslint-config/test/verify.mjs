import { readFile } from "node:fs/promises"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { ESLint } from "eslint"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const configFile = fileURLToPath(new URL("../eslint.config.mjs", import.meta.url))
const fixture = (name) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))
const contents = async (name) => readFile(fixture(name), "utf8")

const unreachable = {
  "@stylistic/js/member-delimiter-style": "TypeScript interface members only; the config parses JavaScript with espree",
  "@stylistic/js/type-annotation-spacing": "TypeScript annotations only; espree cannot parse them",
  "@stylistic/js/type-generic-spacing": "TypeScript generics only; espree cannot parse them",
  "@stylistic/js/type-named-tuple-spacing": "TypeScript named tuples only; espree cannot parse them",
  "import/export": "in ESM, exporting an undefined name is a parse-time early error, so the rule never runs",
  "no-delete-var": "module code is strict, where deleting an unqualified name is a SyntaxError",
  "no-dupe-args": "module code is strict, where duplicate parameters are a SyntaxError",
  "no-inner-declarations": "block-scoped function declarations are legal since ES2015, so the rule's default mode allows them",
  "no-nonoctal-decimal-escape": "module code is strict, where \\8 and \\9 escapes are a SyntaxError",
  "no-octal-escape": "module code is strict, where legacy octal escapes are a SyntaxError",
  "no-octal": "module code is strict, where legacy octal literals are a SyntaxError",
  "no-with": "module code is strict, where with is a SyntaxError"
}

const expected = [
  "@stylistic/js/array-bracket-spacing",
  "@stylistic/js/arrow-parens",
  "@stylistic/js/arrow-spacing",
  "@stylistic/js/block-spacing",
  "@stylistic/js/brace-style",
  "@stylistic/js/comma-dangle",
  "@stylistic/js/comma-spacing",
  "@stylistic/js/comma-style",
  "@stylistic/js/computed-property-spacing",
  "@stylistic/js/dot-location",
  "@stylistic/js/eol-last",
  "@stylistic/js/function-call-spacing",
  "@stylistic/js/generator-star-spacing",
  "@stylistic/js/indent",
  "@stylistic/js/indent-binary-ops",
  "@stylistic/js/jsx-closing-bracket-location",
  "@stylistic/js/jsx-closing-tag-location",
  "@stylistic/js/jsx-curly-brace-presence",
  "@stylistic/js/jsx-curly-newline",
  "@stylistic/js/jsx-curly-spacing",
  "@stylistic/js/jsx-equals-spacing",
  "@stylistic/js/jsx-first-prop-new-line",
  "@stylistic/js/jsx-function-call-newline",
  "@stylistic/js/jsx-indent-props",
  "@stylistic/js/jsx-max-props-per-line",
  "@stylistic/js/jsx-one-expression-per-line",
  "@stylistic/js/jsx-quotes",
  "@stylistic/js/jsx-tag-spacing",
  "@stylistic/js/jsx-wrap-multilines",
  "@stylistic/js/key-spacing",
  "@stylistic/js/keyword-spacing",
  "@stylistic/js/lines-between-class-members",
  "@stylistic/js/max-statements-per-line",
  "@stylistic/js/multiline-ternary",
  "@stylistic/js/new-parens",
  "@stylistic/js/no-extra-parens",
  "@stylistic/js/no-floating-decimal",
  "@stylistic/js/no-mixed-operators",
  "@stylistic/js/no-mixed-spaces-and-tabs",
  "@stylistic/js/no-multi-spaces",
  "@stylistic/js/no-multiple-empty-lines",
  "@stylistic/js/no-tabs",
  "@stylistic/js/no-trailing-spaces",
  "@stylistic/js/no-whitespace-before-property",
  "@stylistic/js/object-curly-spacing",
  "@stylistic/js/operator-linebreak",
  "@stylistic/js/padded-blocks",
  "@stylistic/js/quotes",
  "@stylistic/js/rest-spread-spacing",
  "@stylistic/js/semi",
  "@stylistic/js/semi-spacing",
  "@stylistic/js/space-before-blocks",
  "@stylistic/js/space-before-function-paren",
  "@stylistic/js/space-in-parens",
  "@stylistic/js/space-infix-ops",
  "@stylistic/js/space-unary-ops",
  "@stylistic/js/spaced-comment",
  "@stylistic/js/template-curly-spacing",
  "@stylistic/js/template-tag-spacing",
  "@stylistic/js/wrap-iife",
  "@stylistic/js/yield-star-spacing",
  "accessor-pairs",
  "array-callback-return",
  "block-scoped-var",
  "camelcase",
  "class-methods-use-this",
  "consistent-return",
  "constructor-super",
  "curly",
  "default-case-last",
  "default-param-last",
  "dot-notation",
  "eqeqeq",
  "eslint-comments/no-unlimited-disable",
  "for-direction",
  "getter-return",
  "grouped-accessor-pairs",
  "guard-for-in",
  "import/extensions",
  "import/first",
  "import/named",
  "import/newline-after-import",
  "import/no-absolute-path",
  "import/no-amd",
  "import/no-cycle",
  "import/no-duplicates",
  "import/no-dynamic-require",
  "import/no-extraneous-dependencies",
  "import/no-import-module-exports",
  "import/no-mutable-exports",
  "import/no-named-as-default",
  "import/no-named-as-default-member",
  "import/no-named-default",
  "import/no-relative-packages",
  "import/no-self-import",
  "import/no-unresolved",
  "import/no-useless-path-segments",
  "import/no-webpack-loader-syntax",
  "max-classes-per-file",
  "new-cap",
  "no-alert",
  "no-array-constructor",
  "no-async-promise-executor",
  "no-bitwise",
  "no-caller",
  "no-case-declarations",
  "no-class-assign",
  "no-compare-neg-zero",
  "no-cond-assign",
  "no-const-assign",
  "no-constant-binary-expression",
  "no-constant-condition",
  "no-constructor-return",
  "no-continue",
  "no-control-regex",
  "no-debugger",
  "no-dupe-class-members",
  "no-dupe-else-if",
  "no-dupe-keys",
  "no-duplicate-case",
  "no-else-return",
  "no-empty",
  "no-empty-character-class",
  "no-empty-pattern",
  "no-empty-static-block",
  "no-eval",
  "no-ex-assign",
  "no-extend-native",
  "no-extra-bind",
  "no-extra-boolean-cast",
  "no-extra-label",
  "no-fallthrough",
  "no-func-assign",
  "no-global-assign",
  "no-implied-eval",
  "no-import-assign",
  "no-invalid-regexp",
  "no-irregular-whitespace",
  "no-label-var",
  "no-labels",
  "no-lone-blocks",
  "no-loop-func",
  "no-loss-of-precision",
  "no-misleading-character-class",
  "no-multi-str",
  "no-nested-ternary",
  "no-new",
  "no-new-func",
  "no-new-native-nonconstructor",
  "no-new-object",
  "no-new-wrappers",
  "no-obj-calls",
  "no-param-reassign",
  "no-plusplus",
  "no-promise-executor-return",
  "no-proto",
  "no-prototype-builtins",
  "no-redeclare",
  "no-regex-spaces",
  "no-restricted-globals",
  "no-restricted-properties",
  "no-return-assign",
  "no-script-url",
  "no-self-assign",
  "no-self-compare",
  "no-sequences",
  "no-setter-return",
  "no-shadow",
  "no-shadow-restricted-names",
  "no-sparse-arrays",
  "no-template-curly-in-string",
  "no-this-before-super",
  "no-throw-literal",
  "no-unassigned-vars",
  "no-undef",
  "no-undef-init",
  "no-underscore-dangle",
  "no-unexpected-multiline",
  "no-unmodified-loop-condition",
  "no-unneeded-ternary",
  "no-unreachable",
  "no-unreachable-loop",
  "no-unsafe-finally",
  "no-unsafe-negation",
  "no-unsafe-optional-chaining",
  "no-unused-expressions",
  "no-unused-labels",
  "no-unused-private-class-members",
  "no-use-before-define",
  "no-useless-assignment",
  "no-useless-backreference",
  "no-useless-call",
  "no-useless-catch",
  "no-useless-computed-key",
  "no-useless-concat",
  "no-useless-constructor",
  "no-useless-escape",
  "no-useless-rename",
  "no-useless-return",
  "no-var",
  "no-void",
  "object-property-newline",
  "object-shorthand",
  "one-var",
  "prefer-arrow-callback",
  "prefer-const",
  "prefer-destructuring",
  "prefer-exponentiation-operator",
  "prefer-numeric-literals",
  "prefer-object-has-own",
  "prefer-object-spread",
  "prefer-promise-reject-errors",
  "prefer-regex-literals",
  "prefer-rest-params",
  "prefer-spread",
  "prefer-template",
  "preserve-caught-error",
  "radix",
  "react-hooks/exhaustive-deps",
  "react-hooks/rules-of-hooks",
  "require-yield",
  "symbol-description",
  "unicorn/consistent-empty-array-spread",
  "unicorn/error-message",
  "unicorn/escape-case",
  "unicorn/new-for-builtins",
  "unicorn/no-instanceof-builtins",
  "unicorn/no-new-array",
  "unicorn/no-new-buffer",
  "unicorn/number-literal-case",
  "unicorn/prefer-dom-node-text-content",
  "unicorn/prefer-includes",
  "unicorn/prefer-node-protocol",
  "unicorn/prefer-number-properties",
  "unicorn/prefer-string-starts-ends-with",
  "unicorn/prefer-type-error",
  "unicorn/throw-new-error",
  "unused-imports/no-unused-imports",
  "unused-imports/no-unused-vars",
  "use-isnan",
  "valid-typeof",
  "vars-on-top",
  "yoda"
]

const eslint = new ESLint({ cwd: packageRoot, overrideConfigFile: configFile })
const fixer = new ESLint({ cwd: packageRoot, overrideConfigFile: configFile, fix: true })

const failures = []

const config = await eslint.calculateConfigForFile(fixture("bad.js"))
const configured = Object.entries(config.rules)
  .filter(([ , value ]) => value[0] !== 0 && value[0] !== "off")
  .map(([ name ]) => name)

for (const rule of [ ...expected, ...Object.keys(unreachable) ]) {
  if (!configured.includes(rule)) {
    failures.push(`"${rule}" is pinned by the fixtures but is not enabled in the config`)
  }
}

for (const rule of configured) {
  if (!expected.includes(rule) && !(rule in unreachable)) {
    failures.push(`"${rule}" is enabled in the config but has no fixture; add it to expected and to fixtures/bad.js`)
  }
}

async function fixed(name) {
  const [ result ] = await fixer.lintText(await contents(name), { filePath: fixture(name) })

  return result.output ?? await contents(name)
}

for (const name of [ "good.js", "good.jsx" ]) {
  const [ result ] = await eslint.lintText(await contents(name), { filePath: fixture(name) })

  if (result.messages.length > 0) {
    failures.push(`fixtures/${name} should pass clean, but eslint reported:\n${JSON.stringify(result.messages, null, 2)}`)
  }

  if (await fixed(name) !== await contents(name)) {
    failures.push(`fixtures/${name} should already match the house style, but eslint --fix would rewrite it`)
  }
}

for (const [ name, target ] of [ [ "unformatted.js", "good.js" ], [ "unformatted.jsx", "good.jsx" ] ]) {
  if ((await contents(name)) === (await contents(target))) {
    failures.push(`fixtures/${name} must differ from fixtures/${target}, otherwise the fix check is vacuous`)
  }

  if (await fixed(name) !== await contents(target)) {
    failures.push(`fixtures/${name} should fix to fixtures/${target}`)
  }
}

const hit = new Set()
const unexpected = new Set()

for (const name of [ "bad.js", "unlimited-disable.js" ]) {
  const [ result ] = await eslint.lintText(await contents(name), { filePath: fixture(name) })

  for (const message of result.messages) {
    if (message.ruleId === null) {
      failures.push(`fixtures/${name} reported a message outside any rule: ${message.message} (${message.line}:${message.column})`)
    } else if (!configured.includes(message.ruleId)) {
      unexpected.add(message.ruleId)
    } else {
      hit.add(message.ruleId)
    }
  }
}

for (const rule of expected) {
  if (!hit.has(rule)) {
    failures.push(`"${rule}" never fires in the fixtures; add a violation or mark it unreachable with a reason`)
  }
}

for (const rule of unexpected) {
  failures.push(`"${rule}" fires in the fixtures but is not enabled in the config`)
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

const reachable = expected.length

console.log(`fixtures/good.js and fixtures/good.jsx pass clean; fixtures/unformatted.{js,jsx} fix to exactly their pinned good output; fixtures/bad.js and fixtures/unlimited-disable.js fail with all ${reachable} rules that can fire in module JavaScript, ${Object.keys(unreachable).length} documented as unreachable`)
