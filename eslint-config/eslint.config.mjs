import js from "@eslint/js"
import globals from "globals"
import stylistic from "@stylistic/eslint-plugin"
import unusedImports from "eslint-plugin-unused-imports"

export default {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      "global": "readonly",
      ...globals.browser
    }
  },
  linterOptions: {
    reportUnusedDisableDirectives: "error"
  },
  plugins: {
    "@stylistic/js": stylistic,
    "unused-imports": unusedImports
  },
  ignores: [
    "dist/*",
    "vendor/*"
  ],
  rules: Object.assign({}, js.configs.recommended.rules, {
    "@stylistic/js/array-bracket-spacing": [ "error", "always" ],
    "@stylistic/js/arrow-spacing": [ "error", { "before": true, "after": true } ],
    "@stylistic/js/block-spacing": [ "error", "always" ],
    "@stylistic/js/comma-dangle": [ "error", "never" ],
    "@stylistic/js/comma-spacing": [ "error", { "before": false, "after": true } ],
    "@stylistic/js/comma-style": [ "error", "last" ],
    "@stylistic/js/computed-property-spacing": [ "error", "never" ],
    "@stylistic/js/eol-last": "error",
    "@stylistic/js/function-call-spacing": [ "error", "never" ],
    "@stylistic/js/indent": [ "error", 2, { "SwitchCase": 1 } ],
    "@stylistic/js/no-trailing-spaces": "error",
    "@stylistic/js/quotes": [ "error", "double", { "avoidEscape": true } ],
    "@stylistic/js/semi": [ "error", "never" ],
    "@stylistic/js/space-infix-ops": [ "error" ],
    "@stylistic/js/keyword-spacing": [ "error" ],
    "accessor-pairs": [ "error", { "setWithoutGet": true, "enforceForClassMembers": true } ],
    "array-callback-return": [ "error", { "allowImplicit": false, "checkForEach": false } ],
    "curly": [ "error", "multi-line" ],
    "eqeqeq": [ "error", "always", { "null": "ignore" } ],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-wrappers": "error",
    "no-promise-executor-return": "error",
    "no-prototype-builtins": "error",
    "no-redeclare": "error",
    "no-restricted-globals": [ "error",
      { "name": "isFinite", "message": "Use Number.isFinite instead." },
      { "name": "isNaN", "message": "Use Number.isNaN instead." }
    ],
    "no-restricted-properties": [ "error",
      { "property": "__proto__", "message": "Use Object.getPrototypeOf or Object.setPrototypeOf instead." },
      { "property": "__defineGetter__", "message": "Use Object.defineProperty instead." },
      { "property": "__defineSetter__", "message": "Use Object.defineProperty instead." },
      { "property": "__lookupGetter__", "message": "Use Object.getOwnPropertyDescriptor instead." },
      { "property": "__lookupSetter__", "message": "Use Object.getOwnPropertyDescriptor instead." }
    ],
    "no-self-compare": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "error",
    "no-unused-expressions": [ "error", { "allowShortCircuit": true, "allowTernary": true, "allowTaggedTemplates": true } ],
    "no-unused-vars": "off",
    "no-var": "error",
    "prefer-const": [ "error", { "destructuring": "all" } ],
    "prefer-object-has-own": "error",
    "prefer-promise-reject-errors": [ "error", { "allowEmptyReject": true } ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [ "error", { "args": "none", "caughtErrors": "none", "ignoreRestSiblings": true, "varsIgnorePattern": "^_" } ],
    "use-isnan": [ "error", { "enforceForIndexOf": true } ],
    "valid-typeof": [ "error", { "requireStringLiterals": true } ]
  })
}
