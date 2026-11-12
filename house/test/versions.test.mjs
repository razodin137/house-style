import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..", "..")

function read(...parts) {
  return readFileSync(join(root, ...parts), "utf8")
}

function readJson(...parts) {
  return JSON.parse(read(...parts))
}

const pins = readJson("versions.json")

function floor(range) {
  const match = range.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  assert.ok(match, `no version in "${range}"`)

  const [ , major, minor, patch = "0" ] = match
  return `${Number(major)}.${Number(minor)}.${Number(patch)}`
}

function compare(left, right) {
  const a = left.split(".").map(Number)
  const b = right.split(".").map(Number)

  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }

  return 0
}

function expectPin(tool, range) {
  assert.equal(pins[tool], floor(range), `${tool} should pin the minimum ${range} declares`)
}

test("the javascript lane pins the eslint its package depends on", () => {
  expectPin("eslint", readJson("eslint-config", "package.json").dependencies.eslint)
})

test("the stylelint lanes pin what every stylelint package requires", () => {
  for (const directory of [ "stylelint-config-css", "stylelint-config-scss", "stylelint-config-tokens" ]) {
    expectPin("stylelint", readJson(directory, "package.json").peerDependencies.stylelint)
  }
})

test("the html, biome, and prettier lanes match their package minimums", () => {
  expectPin("html-validate", readJson("html-validate-config", "package.json").peerDependencies["html-validate"])
  expectPin("biome", readJson("biome-config", "package.json").peerDependencies["@biomejs/biome"])
  expectPin("prettier", readJson("prettier-config", "package.json").peerDependencies.prettier)
})

test("the node pin covers the strictest package engine", () => {
  const directories = [
    "biome-config",
    "eslint-config",
    "house",
    "html-validate-config",
    "prettier-config",
    "shot",
    "stylelint-config-css",
    "stylelint-config-scss",
    "stylelint-config-tokens"
  ]

  const required = directories
    .map((directory) => floor(readJson(directory, "package.json").engines.node))
    .reduce((highest, next) => (compare(next, highest) > 0 ? next : highest))

  assert.equal(pins.node, required, `node should pin the strictest engine, ${required}`)
})

test("the ruby lane pins every gem dependency minimum", () => {
  const gemspec = read("rubocop-razodin137.gemspec")

  for (const name of [ "rubocop", "rubocop-rails", "rubocop-performance", "rubocop-minitest" ]) {
    const match = gemspec.match(new RegExp(`add_dependency "${name}", "([^"]+)"`))
    assert.ok(match, `the gemspec should depend on ${name}`)
    expectPin(name, match[1])
  }
})

test("the shell and python lanes pin what their mise files install", () => {
  for (const [ directory, tool ] of [ [ "shell", "shellcheck" ], [ "shell", "shfmt" ], [ "python", "ruff" ] ]) {
    const match = read(directory, "mise.toml").match(new RegExp(`^${tool} = "([^"]+)"`, "m"))
    assert.ok(match, `${directory}/mise.toml should pin ${tool}`)
    expectPin(tool, match[1])
  }
})

test("versions.json names only the pins the lanes need", () => {
  const expected = [
    "node",
    "eslint",
    "stylelint",
    "prettier",
    "biome",
    "html-validate",
    "rubocop",
    "rubocop-rails",
    "rubocop-performance",
    "rubocop-minitest",
    "shellcheck",
    "shfmt",
    "ruff"
  ]

  assert.deepEqual(Object.keys(pins).sort(), expected.sort())
})
