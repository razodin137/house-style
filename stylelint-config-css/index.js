"use strict"

module.exports = {
  extends: "stylelint-config-recommended",

  reportNeedlessDisables: true,

  rules: {
    "comment-no-empty": null,
    "function-linear-gradient-no-nonstandard-direction": true,
    "function-no-unknown": true,
    "unit-no-unknown": true
  }
}
