"use strict"

module.exports = {
  extends: [ "html-validate:recommended" ],

  rules: {
    "attr-quotes": [ "error", { "style": "double" } ],
    "heading-level": "error",
    "input-missing-label": "error",
    "no-missing-references": "error",
    "svg-focusable": "error",
    "void-style": [ "error", { "style": "omit" } ]
  }
}
