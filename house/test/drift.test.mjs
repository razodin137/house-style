import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const house = resolve(here, "..")
const root = resolve(house, "..")

test("the bundled Ruby config matches the gem config", () => {
  assert.equal(
    readFileSync(join(house, "configs", "rubocop-ruby.yml"), "utf8"),
    readFileSync(join(root, "rubocop-ruby.yml"), "utf8")
  )
})

test("the bundled Python config matches the vendored config", () => {
  assert.equal(
    readFileSync(join(house, "configs", "ruff.toml"), "utf8"),
    readFileSync(join(root, "python", "ruff.toml"), "utf8")
  )
})
