"use strict"

module.exports = {
  plugins: [ "stylelint-declaration-strict-value" ],

  reportNeedlessDisables: true,

  rules: {
    "custom-property-pattern": "^(color|space|text)-([a-z0-9]+)(-[a-z0-9]+)*$",

    "scale-unlimited/declaration-strict-value": [
      [ "/^(?!--).*color$/i", "/^fill$/i", "/^stroke$/i", "/^font-family$/i" ],
      {
        ignoreValues: [ "inherit", "currentColor", "transparent", "none" ],
        ignoreFunctions: false,
        ignoreAtRules: "@font-face"
      }
    ]
  }
}
